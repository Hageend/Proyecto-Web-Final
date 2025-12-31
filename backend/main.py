from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import numpy as np

from generator import create_dungeon_layout
from ia.adapter import MapAdapter
from ia.evaluator import MapEvaluator

app = FastAPI(title="AI Procedural Realms API")

# --- CORS ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IA ---
adapter = MapAdapter()
evaluator = MapEvaluator()
print("🧠 IA Inicializada.")

# --- MODELOS ---
class MapConfig(BaseModel):
    width: int = 50
    height: int = 30
    min_leaf_size: int = 6
    padding: Optional[int] = 1
    environment_type: str = 'dungeon'
    overrides: Optional[Dict[str, Any]] = None

class VoteRequest(BaseModel):
    environment_type: str
    winning_metrics: Dict[str, float]
    losing_metrics: Dict[str, float]

class TrainingPairResponse(BaseModel):
    map_a: Dict[str, Any]
    map_b: Dict[str, Any]

# --- ENDPOINTS ---

@app.post("/generate_map/")
def generate_map_endpoint(config: MapConfig):
    base_config = config.dict()
    adjusted_config = adapter.get_adjusted_config(base_config, config.environment_type)
    dungeon_grid = create_dungeon_layout(adjusted_config)
    return {"map_layout": dungeon_grid.tolist(), "applied_config": adjusted_config}

@app.post("/train/pair", response_model=TrainingPairResponse)
def generate_training_pair(config: MapConfig):
    maps_data = []
    for i in range(2):
        base_dict = config.dict()
        final_config = adapter.get_adjusted_config(base_dict, config.environment_type)
        grid = create_dungeon_layout(final_config)
        score, metrics = evaluator.score(grid)
        maps_data.append({
            "id": f"map_{i}",
            "grid": grid.tolist(),
            "metrics": metrics,
            "score": score
        })
    return {"map_a": maps_data[0], "map_b": maps_data[1]}

@app.post("/train/vote")
def vote_endpoint(vote_data: VoteRequest):
    try:
        adapter.learn(vote_data.winning_metrics, vote_data.losing_metrics)
        new_params = adapter.adjust_environment_params(vote_data.environment_type, vote_data.winning_metrics)
        evaluator.reload_weights()
        return {"status": "success", "new_params": new_params}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ia/status") # RUTA CORREGIDA
def get_ia_status():
    try:
        evaluator.reload_weights()
        return {"weights": evaluator.weights, "learning_rate": evaluator.learning_rate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_map/visual_text/", response_class=PlainTextResponse)
def generate_map_visual_text(config: MapConfig):
    base_config = config.dict()
    final_config = adapter.get_adjusted_config(base_config, config.environment_type)
    grid = create_dungeon_layout(final_config)
    chars = {0: '#', 1: '.', 2: 'O', 3: '='}
    map_string = ""
    for row in grid:
        map_string += "".join([chars.get(c, '?') for c in row]) + "\n"
    return map_string
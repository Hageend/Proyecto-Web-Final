from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import numpy as np

# --- Módulos Propios ---
from generator import create_dungeon_layout
from ia.adapter import MapAdapter
from ia.evaluator import MapEvaluator

app = FastAPI(title="AI Procedural Realms API")

# --- CORS ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INICIALIZACIÓN IA ---
# Instanciamos globalmente para mantener estado en memoria y caché
adapter = MapAdapter()
evaluator = MapEvaluator()

print("🧠 IA Inicializada: Pesos y Ajustes cargados.")

# --- MODELOS PYDANTIC ---

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
    map_a: Dict[str, Any] # Contiene grid, metrics, score, id
    map_b: Dict[str, Any]

# --- ENDPOINTS ESTÁNDAR ---

@app.post("/generate_map/")
def generate_map_endpoint(config: MapConfig):
    """
    Genera un solo mapa.
    IMPORTANTE: Aplica los ajustes aprendidos por la IA automáticamente.
    """
    # 1. Convertir config de usuario a dict base
    base_config = config.dict()
    
    # 2. IA: Consultar al Adapter por ajustes aprendidos
    # (Ej: si la IA aprendió que te gustan más obstáculos, modificará la config aquí)
    adjusted_config = adapter.get_adjusted_config(base_config, config.environment_type)
    
    # 3. Generar mapa con config optimizada
    dungeon_grid = create_dungeon_layout(adjusted_config)
    
    return {
        "map_layout": dungeon_grid.tolist(),
        "applied_config": adjusted_config # Útil para debug
    }

# --- ENDPOINTS DE ENTRENAMIENTO (RL) ---

@app.post("/train/pair", response_model=TrainingPairResponse)
def generate_training_pair(config: MapConfig):
    """
    Genera DOS mapas usando la configuración actual (más variaciones aleatorias)
    para que el usuario elija. Devuelve también sus métricas.
    """
    maps_data = []
    
    # Generamos 2 mapas
    for i in range(2):
        # Usamos la configuración base + ajustes actuales IA
        # Nota: La aleatoriedad natural de 'la.py' hará que sean diferentes
        base_dict = config.dict()
        final_config = adapter.get_adjusted_config(base_dict, config.environment_type)
        
        # Generar
        grid = create_dungeon_layout(final_config)
        
        # IA: Evaluar el mapa
        score, metrics = evaluator.score(grid)
        
        maps_data.append({
            "id": f"map_{i}",
            "grid": grid.tolist(),
            "metrics": metrics,
            "score": score
        })
    
    return {
        "map_a": maps_data[0],
        "map_b": maps_data[1]
    }

@app.post("/train/vote")
def vote_endpoint(vote_data: VoteRequest):
    """
    Recibe la elección del usuario (metrics del ganador vs perdedor).
    Ejecuta el aprendizaje y ajusta los pesos.
    """
    try:
        print(f"🗳️ Voto recibido para entorno: {vote_data.environment_type}")
        
        # 1. Ajustar Pesos (Weights) del Evaluador
        new_weights = adapter.learn(
            winning_map_metrics=vote_data.winning_metrics,
            losing_map_metrics=vote_data.losing_metrics
        )
        
        # 2. Ajustar Parámetros del Entorno (Environment Params)
        # Ej: Si gana un mapa denso, aumentar densidad futura
        new_env_params = adapter.adjust_environment_params(
            vote_data.environment_type,
            vote_data.winning_metrics
        )
        
        # 3. Recargar el evaluador con los nuevos pesos en memoria
        evaluator.reload_weights()
        
        return {
            "status": "success",
            "message": "Learning complete",
            "new_weights": new_weights,
            "new_params": new_env_params
        }
        
    except Exception as e:
        print(f"❌ Error en aprendizaje: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_map/visual_text/", response_class=PlainTextResponse)
def generate_map_visual_text(config: MapConfig):
    # Versión visual simple para pruebas con cURL
    base_config = config.dict()
    final_config = adapter.get_adjusted_config(base_config, config.environment_type)
    grid = create_dungeon_layout(final_config)
    
    chars = {0: '#', 1: '.', 2: 'O', 3: '='}
    map_string = f"Tipo: {config.environment_type} (IA Adjusted)\n"
    height, width = grid.shape
    for y in range(height):
        for x in range(width):
            map_string += chars.get(grid[y, x], '?')
        map_string += "\n"
    return map_string

@app.get("/ia/status")
def get_ia_status():
    """Devuelve los pesos actuales y la iteración de aprendizaje."""
    try:
        # Forzamos la recarga desde disco para tener el dato fresco
        evaluator.reload_weights()
        return {
            "weights": evaluator.weights,
            "learning_rate": evaluator.learning_rate,
            # Podrías agregar la iteración si la guardas en el evaluador o adapter
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
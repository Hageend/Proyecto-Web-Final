import json
import numpy as np
from pathlib import Path

class MapEvaluator:
    def __init__(self, config_path=None):
        if config_path is None:
            config_path = Path(__file__).parent / "configs" / "weights.json"
        
        self.config_path = config_path
        self.weights = {}
        self.learning_rate = 0.1
        self._load_weights()
    
    def _load_weights(self):
        try:
            with open(self.config_path, 'r') as f:
                data = json.load(f)
                self.learning_rate = data.get('learning_rate', 0.1) # FIX IMPORTANTE
                self.weights = data.get('weights', self._get_default_weights())
        except (FileNotFoundError, json.JSONDecodeError):
            self.weights = self._get_default_weights()
    
    def _get_default_weights(self):
        return {
            'room_density': 0.25,
            'path_density': 0.20,
            'obstacle_density': 0.15,
            'avg_room_size': 0.20,
            'connectivity': 0.10,
            'chaos': 0.10 # Métrica nueva
        }
    
    # --- MÉTRICAS ---
    def calculate_room_density(self, grid):
        return np.count_nonzero(grid == 1) / grid.size if grid.size > 0 else 0

    def calculate_obstacle_density(self, grid):
        return np.count_nonzero(grid >= 2) / grid.size if grid.size > 0 else 0

    def calculate_chaos(self, grid):
        """Mide la entropía visual (bordes irregulares)"""
        if grid.size == 0: return 0
        vertical_changes = np.sum(grid[:-1] != grid[1:])
        horizontal_changes = np.sum(grid[:, :-1] != grid[:, 1:])
        total_edges = vertical_changes + horizontal_changes
        return total_edges / (grid.size * 2)

    def calculate_metrics(self, grid):
        # Implementación simplificada para rendimiento.
        # En producción, usa tu lógica BFS completa si lo prefieres.
        return {
            'room_density': self.calculate_room_density(grid),
            'obstacle_density': self.calculate_obstacle_density(grid),
            'chaos': self.calculate_chaos(grid),
            # Placeholders seguros
            'path_density': 0.2, 
            'avg_room_size': 0.5,
            'connectivity': 1.0
        }
    
    def score(self, grid):
        metrics = self.calculate_metrics(grid)
        score = 0.0
        for key, value in metrics.items():
            if key in self.weights:
                score += value * self.weights[key]
        return score, metrics

    def reload_weights(self):
        self._load_weights()
import json
import os
import numpy as np
from pathlib import Path
from copy import deepcopy

class MapAdapter:
    def __init__(self):
        self.weights_path = Path(__file__).parent / "configs" / "weights.json"
        self.env_path = Path(__file__).parent / "configs" / "environment_adjustments.json"
        self.learning_rate = 0.1
        self._ensure_files()

    def _ensure_files(self):
        os.makedirs(self.weights_path.parent, exist_ok=True)
        if not self.weights_path.exists():
            with open(self.weights_path, 'w') as f: json.dump({}, f)
        if not self.env_path.exists():
            with open(self.env_path, 'w') as f: json.dump({}, f)

    def _load_json(self, path):
        try:
            with open(path, 'r') as f: return json.load(f)
        except: return {}

    def _save_json(self, path, data):
        with open(path, 'w') as f: json.dump(data, f, indent=2)

    def get_adjusted_config(self, base_config, env_type):
        adjustments = self._load_json(self.env_path)
        env_adj = adjustments.get(env_type, {})
        config = deepcopy(base_config)
        config.update(env_adj)
        return config

    def learn(self, winning_metrics, losing_metrics):
        data = self._load_json(self.weights_path)
        weights = data.get('weights', {})
        self.learning_rate = data.get('learning_rate', 0.1)

        if not weights:
            weights = {'room_density': 0.25, 'obstacle_density': 0.15, 'chaos': 0.1}

        # Aprendizaje
        for metric, w_val in winning_metrics.items():
            if metric in weights:
                weights[metric] += self.learning_rate * w_val * 0.5
                if losing_metrics and metric in losing_metrics:
                    l_val = losing_metrics[metric]
                    if l_val > w_val:
                        weights[metric] -= self.learning_rate * (l_val - w_val) * 0.2
                weights[metric] = max(0.01, min(0.6, weights[metric]))

        # Normalizar
        total = sum(weights.values())
        if total > 0:
            weights = {k: v/total for k,v in weights.items()}

        data['weights'] = weights
        data['learning_rate'] = self.learning_rate
        self._save_json(self.weights_path, data)
        return weights

    def adjust_environment_params(self, env_type, winning_metrics):
        adjustments = self._load_json(self.env_path)
        if env_type not in adjustments: adjustments[env_type] = {}
        env_adj = adjustments[env_type]

        # 1. Ajuste de CAOS (Roughness) - ¡LA PARTE NUEVA!
        chaos = winning_metrics.get('chaos', 0)
        if chaos > 0.12: # Al usuario le gusta el Caos
            if env_type == 'dungeon':
                # Subir rugosidad (max 0.7)
                env_adj['roughness'] = min(0.7, env_adj.get('roughness', 0.0) + 0.1)
            elif env_type == 'forest':
                env_adj['cellular_automata_passes'] = max(1, env_adj.get('cellular_automata_passes', 3) - 1)
        
        elif chaos < 0.08: # Al usuario le gusta el Orden
            if env_type == 'dungeon':
                env_adj['roughness'] = max(0.0, env_adj.get('roughness', 0.0) - 0.1)
            elif env_type == 'forest':
                env_adj['cellular_automata_passes'] = min(5, env_adj.get('cellular_automata_passes', 3) + 1)

        # 2. Ajuste de Obstáculos
        obs = winning_metrics.get('obstacle_density', 0)
        if obs > 0.15:
            env_adj['obstacle_multiplier'] = min(2.0, env_adj.get('obstacle_multiplier', 1.0) + 0.1)
        elif obs < 0.05:
            env_adj['obstacle_multiplier'] = max(0.5, env_adj.get('obstacle_multiplier', 1.0) - 0.1)

        adjustments[env_type] = env_adj
        self._save_json(self.env_path, adjustments)
        return env_adj
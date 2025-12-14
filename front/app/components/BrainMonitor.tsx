import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { useNavigation } from "react-router";

export function BrainMonitor() {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const navigation = useNavigation();

  // Función para cargar pesos
  const fetchWeights = async () => {
    try {
      const data = await apiFetch<any>("/ia/status");
      setWeights(data.weights);
    } catch (e) {
      console.error("Error cargando cerebro:", e);
    }
  };

  // 1. Cargar al montar
  useEffect(() => { fetchWeights(); }, []);

  // 2. Recargar cada vez que terminamos de entrenar (cuando navigation vuelve a "idle")
  useEffect(() => {
    if (navigation.state === "idle") {
      fetchWeights();
    }
  }, [navigation.state]);

  // Convertimos el objeto a array para mapear
  const metrics = Object.entries(weights);

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg w-full max-w-sm shrink-0 mr-2">
      <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
        🧠 Estado Neuronal
        <span className="text-xs text-gray-500 font-normal ml-auto">En vivo</span>
      </h3>
      
      <div className="space-y-3">
        {metrics.map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
              <span className="font-mono text-emerald-500">{value.toFixed(3)}</span>
            </div>
            {/* Barra de progreso visual */}
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-emerald-600 to-cyan-600 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(value * 100, 5), 100)}%` }} // Clamp entre 5% y 100%
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
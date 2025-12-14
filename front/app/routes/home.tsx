import { Form, useNavigation, Link } from "react-router";
import type { Route } from "./+types/home";
import { apiFetch } from "../services/api";
import { useState, useEffect } from "react";

// --- TIPOS ---
interface MapConfig {
  width: number;
  height: number;
  min_leaf_size: number;
  padding: number;
  environment_type: string;
}

interface DungeonResponse {
  map_layout: number[][];
}

// Configuración por defecto
const DEFAULT_CONFIG: MapConfig = {
  width: 50,
  height: 30,
  min_leaf_size: 6,
  padding: 1,
  environment_type: "dungeon",
};

// --- LOADER ---
export async function loader({ request }: Route.LoaderArgs) {
  return await apiFetch<DungeonResponse>("/generate_map/", {
    method: "POST",
    body: JSON.stringify(DEFAULT_CONFIG),
  });
}

// --- ACTION ---
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const width = parseInt(formData.get("width") as string) || 50;
  const height = parseInt(formData.get("height") as string) || 30;
  const envType = formData.get("environment_type") as string || "dungeon";
  const config: MapConfig = {
    ...DEFAULT_CONFIG,
    width: width,
    height: height,
    environment_type: envType,
  };
  return await apiFetch<DungeonResponse>("/generate_map/", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

// --- FUNCIÓN DE ESTILOS ---
function getCellStyle(value: number): string {
  switch (value) {
    case 0: return "bg-neutral-900";
    case 1: return "bg-amber-100/90";
    case 2: return "bg-stone-500 rounded-full scale-90 shadow-sm border border-stone-600";
    case 3: return "bg-amber-800 rounded-sm scale-x-75 border border-amber-900";
    default: return "bg-pink-500";
  }
}

// --- COMPONENTE ---
export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const data = actionData || loaderData;
  const grid = data.map_layout;

  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";
  const [currentEnv, setCurrentEnv] = useState("dungeon");
  const [dims, setDims] = useState({ width: 50, height: 30 });

  useEffect(() => {
    if (navigation.formData) {
      const env = navigation.formData.get("environment_type") as string;
      const w = navigation.formData.get("width");
      const h = navigation.formData.get("height");

      if (env) setCurrentEnv(env);
      if (w && h) setDims({ width: Number(w), height: Number(h) });
    }
  }, [navigation.formData]);

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8 flex flex-col items-center font-sans">

      {/* HEADER */}
      <div className="mb-6 text-center space-y-1">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
          Procedural Realms
        </h1>
      </div>

      {/* CONTROLES */}
      <div className="mb-6 bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl w-full max-w-2xl">
        <div className="flex gap-4 mb-6">
        </div>
        <Form method="post" className="flex flex-col md:flex-row gap-6 items-end justify-center">

          {/* Inputs de Dimensiones */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ancho</label>
              <input
                type="number"
                name="width"
                value={dims.width}
                onChange={(e) => setDims({ ...dims, width: Number(e.target.value) })}
                min="10" max="100"
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all w-full"
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Alto</label>
              <input
                type="number"
                name="height"
                value={dims.height}
                onChange={(e) => setDims({ ...dims, height: Number(e.target.value) })}
                min="10" max="100"
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all w-full"
              />
            </div>
          </div>

          {/* Selector de Bioma */}
          <div className="flex flex-col w-full md:w-auto flex-grow">
            <label className="text-xs text-gray-400 mb-1 font-bold uppercase tracking-wider">
              Bioma
            </label>
            <select
              name="environment_type"
              value={currentEnv}
              onChange={(e) => setCurrentEnv(e.target.value)}
              className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer w-full"
            >
              <option value="dungeon">🏰 Dungeon (BSP)</option>
              <option value="forest">🌲 Forest (Hybrid)</option>
              <option value="path_focused">🛤️ Path (Winding)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className={`
              w-full md:w-auto px-6 py-2 h-[42px] rounded-xl font-bold text-sm shadow-lg transition-all 
              ${isGenerating
                ? "bg-neutral-700 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:scale-105 text-white"}
            `}
          >
            {isGenerating ? "..." : "GENERAR"}
          </button>
          
        </Form>
        
      </div>
      <Link
            to="/train"
            className="px-6 py-2 rounded-lg border border-purple-500 text-purple-400 hover:bg-purple-500/10 font-bold transition flex items-center gap-2 w-fit m-5 mb-8"
          >
            🧠 Entrenar IA
          </Link>

      {/* VISUALIZADOR */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

        <div className="relative bg-neutral-900 p-4 rounded-xl border border-neutral-800 shadow-2xl overflow-auto max-w-[95vw] max-h-[70vh]">
          <div className="sticky top-0 left-0 mb-2 text-xs text-gray-500 font-mono">
            Grid: {cols}x{rows}
          </div>

          <div
            className="grid gap-px bg-neutral-900 mx-auto"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              width: "fit-content",
            }}
          >
            {grid.map((row, y) => (
              row.map((cellValue, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`
                    ${cols > 60 ? 'w-2 h-2 sm:w-3 sm:h-3' : 'w-4 h-4 sm:w-5 sm:h-5'} 
                    transition-colors duration-300
                    ${getCellStyle(cellValue)}
                  `}
                  title={`(${x},${y})`}
                />
              ))
            ))}
          </div>
        </div>
      </div>
      {/* LEYENDA DE COLORES */}
      <div className="mt-6 flex flex-wrap gap-6 justify-center bg-neutral-900 p-4 rounded-xl border border-neutral-800 shadow-lg">

        {/*SUELO */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-amber-100/90 rounded-sm shadow-sm"></div>
          <span className="text-gray-300 text-sm font-medium">Suelo</span>
        </div>

        {/*ROCA */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-stone-500 rounded-full border border-stone-600 shadow-sm"></div>
          <span className="text-gray-300 text-sm font-medium">Roca</span>
        </div>

        {/*TRONCO */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-amber-800 rounded-sm border border-amber-950 shadow-sm"></div>
          <span className="text-gray-300 text-sm font-medium">Tronco</span>
        </div>

        {/*VACÍO */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-neutral-950 border border-neutral-700 rounded-sm"></div>
          <span className="text-gray-500 text-sm font-medium">Vacío / Pared</span>
        </div>

      </div>
    </div>
  );
}
import { Form, useNavigation, Link } from "react-router";
import type { Route } from "./+types/train";
import { apiFetch } from "../services/api";
import { MapGrid } from "../components/MapGrid";
import { BrainMonitor } from "../components/BrainMonitor";

// --- TIPOS ---
interface MapData {
  id: string;
  grid: number[][];
  metrics: Record<string, number>;
  score: number;
}

interface TrainingPairResponse {
  map_a: MapData;
  map_b: MapData;
}

// --- LOADER ---
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const envType = url.searchParams.get("env") || "dungeon";
  const trainConfig = {
    width: 40, 
    height: 25,
    min_leaf_size: 6,
    padding: 1,
    environment_type: envType 
  };

  const data = await apiFetch<TrainingPairResponse>("/train/pair", {
    method: "POST",
    body: JSON.stringify(trainConfig),
  });

  return { ...data, currentEnv: envType };
}

// --- ACTION ---
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  
  const winningMetrics = JSON.parse(formData.get("winningMetrics") as string);
  const losingMetrics = JSON.parse(formData.get("losingMetrics") as string);
  const envType = formData.get("envType") as string;

  await apiFetch("/train/vote", {
    method: "POST",
    body: JSON.stringify({
      environment_type: envType,
      winning_metrics: winningMetrics,
      losing_metrics: losingMetrics,
    }),
  });

  return { success: true };
}

// --- COMPONENTE PRINCIPAL ---
export default function Train({ loaderData }: Route.ComponentProps) {
  const { map_a, map_b, currentEnv } = loaderData;
  const navigation = useNavigation();
  const isTraining = navigation.state === "submitting";
  
  // Tabs Helper
  const getTabClass = (env: string) => `
    flex-1 text-center px-3 py-2 text-sm sm:text-base rounded-lg font-bold transition-all whitespace-nowrap
    ${currentEnv === env 
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 border border-emerald-400" 
      : "bg-neutral-800 text-gray-400 hover:bg-neutral-700 hover:text-white border border-transparent"}
  `;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-3 sm:p-6 flex flex-col items-center">
      
      {/*HEADER & NAV */}
      <div className="w-full max-w-7xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link to="/" className="text-gray-400 hover:text-white transition flex items-center gap-1 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> 
              <span className="font-medium">Home</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-500">
              Dojo IA
            </h1>
        </div>

        {/* Tabs*/}
        <div className="flex w-full md:w-auto gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
            <Link to="?env=dungeon" className={getTabClass("dungeon")}>🏰 Dungeon</Link>
            <Link to="?env=forest" className={getTabClass("forest")}>🌲 Forest</Link>
            <Link to="?env=path_focused" className={getTabClass("path_focused")}>🛤️ Path</Link>
        </div>
      </div>

      {/*LAYOUT PRINCIPAL */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: Monitor */}
        <div className="lg:col-span-3 w-full flex flex-col sm:flex-row lg:flex-col gap-4">
           {/* Monitor */}
           <div className="flex-1 lg:sticky lg:top-4">
             <BrainMonitor />
           </div>
           
           {/* Info Box */}
           <div className="flex-1 p-4 bg-blue-900/10 border border-blue-800/30 rounded-xl text-xs text-blue-200 lg:mt-0">
              <p className="font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span> ¿Cómo funciona?
              </p>
              <p className="leading-relaxed opacity-80">
                Entrenando modelo <strong>{currentEnv.toUpperCase()}</strong>.
                Si eliges mapas con muchos obstáculos, la barra <em>Obstacle Density</em> subirá y la IA generará mapas más densos.
              </p>
           </div>
        </div>

        {/* COLUMNA DERECHA: Zona de Batalla */}
        <div className="lg:col-span-9 w-full">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch">
            
            {/* Opción A */}
            <MapCard 
              mapData={map_a} 
              opponentData={map_b} 
              label="A" 
              color="cyan" 
              isTraining={isTraining}
              envType={currentEnv} 
            />
            
            {/* VS Badge*/}
            <div className="flex items-center justify-center py-2 md:py-0">
              <div className="bg-neutral-800 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-black text-gray-500 border-4 border-neutral-950 shadow-xl z-10 shrink-0">
                VS
              </div>
            </div>

            {/* Opción B */}
            <MapCard 
              mapData={map_b} 
              opponentData={map_a} 
              label="B" 
              color="rose" 
              isTraining={isTraining} 
              envType={currentEnv}
            />
          </div>
        </div>
      </div>

      {/* Overlay de Carga */}
      {isTraining && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col items-center animate-pulse mx-4 text-center">
            <div className="text-4xl mb-4 animate-bounce">🧠</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Aprendiendo...</h3>
            <p className="text-gray-400 text-sm">Ajustando pesos neuronales</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE MAP CARD ---
function MapCard({ 
  mapData, 
  opponentData, 
  label, 
  color, 
  isTraining,
  envType 
}: { 
  mapData: MapData, 
  opponentData: MapData,
  label: string, 
  color: "cyan" | "rose",
  isTraining: boolean,
  envType: string
}) {
  const theme = color === "cyan" 
    ? { text: "text-cyan-400", border: "border-cyan-500/30", btn: "bg-cyan-600 hover:bg-cyan-500" }
    : { text: "text-rose-400", border: "border-rose-500/30", btn: "bg-rose-600 hover:bg-rose-500" };

  const metrics = mapData.metrics || {};

  return (
    <div className={`flex-1 flex flex-col gap-3 p-3 sm:p-4 rounded-2xl border-2 bg-neutral-900/60 backdrop-blur-sm transition-all duration-300 hover:border-opacity-60 ${theme.border} shadow-lg group`}>
      
      {/* Header Card */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h2 className={`text-xl sm:text-2xl font-black ${theme.text}`}>OPCIÓN {label}</h2>
        <div className="text-[10px] sm:text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded border border-white/5">
          Score: {(mapData.score || 0).toFixed(3)}
        </div>
      </div>

      {/* Mapa */}
      <div className="w-full bg-neutral-950/50 rounded-lg overflow-hidden border border-white/5">
         <MapGrid grid={mapData.grid} className="w-full h-auto mx-auto" />
      </div>

      {/* Métricas Compactas */}
      <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs text-gray-400 font-mono bg-black/20 p-2 rounded-lg text-center">
        <MetricItem label="Densidad" value={metrics.room_density} />
        <MetricItem label="Obstáculos" value={metrics.obstacle_density} />
        <MetricItem label="Caos" value={metrics.chaos} isFloat />
      </div>

      {/* Botón */}
      <Form method="post" className="mt-auto pt-2">
        <input type="hidden" name="envType" value={envType} />
        <input type="hidden" name="winningMetrics" value={JSON.stringify(metrics)} />
        <input type="hidden" name="losingMetrics" value={JSON.stringify(opponentData.metrics || {})} />
        
        <button
          type="submit"
          disabled={isTraining}
          className={`
            w-full py-3 rounded-xl font-bold text-sm sm:text-base text-white shadow-lg 
            transition-all transform active:scale-[0.98]
            ${theme.btn} disabled:opacity-50 disabled:grayscale
            flex items-center justify-center gap-2
          `}
        >
          {isTraining ? (
            <span className="inline-block animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"/>
          ) : (
            `ELEGIR ${label}`
          )}
        </button>
      </Form>
    </div>
  );
}

function MetricItem({ label, value, isFloat }: { label: string, value?: number, isFloat?: boolean }) {
  const val = value ?? 0;
  return (
    <div className="flex flex-col">
      <span className="font-bold text-gray-600 mb-0.5">{label}</span>
      <span className="text-gray-200">
        {isFloat ? val.toFixed(2) : `${(val * 100).toFixed(0)}%`}
      </span>
    </div>
  );
}
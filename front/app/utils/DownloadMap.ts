const THEME_COLORS: Record<string, Record<number, string>> = {
  dungeon: {
    0: "#171717", // Pared 
    1: "#525252", // Suelo
    2: "#a8a29e", // Roca
    3: "#78350f", // Objeto/Madera
  },
  forest: {
    0: "#052e16", // Árboles
    1: "#16a34a", // Pasto
    2: "#57534e", // Roca
    3: "#3f6212", // Arbusto denso
  },
  path_focused: {
    0: "#0f172a", // Vacío
    1: "#fcd34d", // Camino
    2: "#64748b", // Bloqueo
    3: "#d97706", // Decoración
  }
};

const CELL_SIZE = 32; 

export function downloadMapAsPng(grid: number[][], envType: string, filename: string = "mapa") {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const palette = THEME_COLORS[envType] || THEME_COLORS["dungeon"];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cellValue = grid[y][x];
      
      // Color base
      ctx.fillStyle = palette[cellValue] || "#ff00ff";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `${filename}_${envType}_${timestamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  link.remove();
}
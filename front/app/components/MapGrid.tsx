interface MapGridProps {
  grid: number[][];
  className?: string;
}

export function MapGrid({ grid, className = "" }: MapGridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  function getCellStyle(value: number): string {
    switch (value) {
      case 0: return "bg-neutral-900"; 
      case 1: return "bg-amber-100/90";
      case 2: return "bg-stone-500 rounded-full scale-90 shadow-sm border border-stone-600";
      case 3: return "bg-amber-800 rounded-sm scale-x-75 border border-amber-900"; 
      default: return "bg-pink-500"; 
    }
  }

  return (
    <div className={`relative bg-neutral-900 p-2 rounded-lg border border-neutral-800 shadow-xl overflow-hidden ${className}`}>
      <div 
        className="grid gap-[1px] bg-neutral-900 mx-auto"
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
                w-2 h-2 sm:w-3 sm:h-3 
                ${getCellStyle(cellValue)}
              `}
            />
          ))
        ))}
      </div>
    </div>
  );
}
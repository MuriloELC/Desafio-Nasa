type Props = { latitude: number; longitude: number };

type CanvasProps = Props & {
  className?: string;
  onSelect?: (point: Props) => void;
  showRadius?: boolean;
};

const ZOOM = 15;
const TILE = 256;

function tilePosition(latitude: number, longitude: number) {
  const scale = 2 ** ZOOM;
  const latRad = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function geographicPosition(worldX: number, worldY: number) {
  const worldSize = TILE * 2 ** ZOOM;
  const longitude = (worldX / worldSize) * 360 - 180;
  const normalizedY = worldY / worldSize;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - 2 * normalizedY))) * 180) / Math.PI;
  return { latitude, longitude };
}

export function SatelliteMapCanvas({
  latitude,
  longitude,
  className = "h-[420px]",
  onSelect,
  showRadius = true,
}: CanvasProps) {
  const point = tilePosition(latitude, longitude);
  const originX = Math.floor(point.x) - 2;
  const originY = Math.floor(point.y) - 2;
  const markerX = (point.x - originX) * TILE;
  const markerY = (point.y - originY) * TILE;

  return (
    <div
      className={`satellite-map relative w-full overflow-hidden bg-[#263b1b] ${onSelect ? "cursor-crosshair" : ""} ${className}`}
      role="img"
      aria-label={`Imagem de satélite centrada no ponto ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
      onClick={
        onSelect
          ? (event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const gridX = event.clientX - bounds.left - bounds.width / 2 + markerX;
              const gridY = event.clientY - bounds.top - bounds.height / 2 + markerY;
              onSelect(geographicPosition(originX * TILE + gridX, originY * TILE + gridY));
            }
          : undefined
      }
    >
      <div
        className="absolute grid grid-cols-5"
        style={{
          width: TILE * 5,
          height: TILE * 5,
          left: "50%",
          top: "50%",
          transform: `translate(${-markerX}px, ${-markerY}px)`,
        }}
      >
        {Array.from({ length: 25 }, (_, index) => {
          const column = index % 5;
          const row = Math.floor(index / 5);
          return (
            <img
              key={`${column}-${row}`}
              src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${originY + row}/${originX + column}`}
              alt=""
              width={TILE}
              height={TILE}
              loading="eager"
              draggable={false}
              className="block size-64 max-w-none select-none"
            />
          );
        })}
        {showRadius ? (
          <span className="territory-map-radius" style={{ left: markerX, top: markerY }} />
        ) : null}
        <span className="territory-map-point" style={{ left: markerX, top: markerY }} />
      </div>
      <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
        Esri, Maxar, Earthstar Geographics e GIS User Community
      </span>
    </div>
  );
}

export function TerritoryMap({ latitude, longitude }: Props) {
  return (
    <figure className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
      <SatelliteMapCanvas latitude={latitude} longitude={longitude} />
      <figcaption className="px-4 py-3 text-xs text-muted-foreground">
        O círculo destaca o ponto informado, não o limite real do talhão. Imagem: Esri World Imagery
        e provedores indicados no mapa.
      </figcaption>
    </figure>
  );
}

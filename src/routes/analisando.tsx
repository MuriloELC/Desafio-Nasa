import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Database, MapPinned, Satellite, Sprout } from "lucide-react";
import { Brand } from "@/components/cereja-shell";
import { PROFILE_STORAGE_KEY } from "@/lib/storage";
import type { FarmProfile } from "@/demo/cereja-demo";

export const Route = createFileRoute("/analisando")({
  head: () => ({
    meta: [
      { title: "Lendo seu território · Cerejá" },
      { name: "description", content: "Cruzando a área delimitada com referências orbitais." },
    ],
  }),
  component: AnalysingPage,
});

const stages = [
  { icon: MapPinned, label: "Território delimitado" },
  { icon: Satellite, label: "Lendo chuva e umidade regional" },
  { icon: Database, label: "Cruzando cafezal, água e objetivo" },
  { icon: Sprout, label: "Comparando coberturas e ressalvas" },
];

function AnalysingPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [profile, setProfile] = useState<FarmProfile | null>(null);

  useEffect(() => {
    try {
      setProfile(
        JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "null") as FarmProfile | null,
      );
    } catch {
      /* a animação funciona sem o perfil salvo */
    }
  }, []);

  useEffect(() => {
    const timers = stages.map((_, index) => window.setTimeout(() => setStage(index), index * 1050));
    const finish = window.setTimeout(() => void navigate({ to: "/minha-terra" }), 4650);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finish);
    };
  }, [navigate]);

  const polygon = profile?.location?.polygon ?? [
    { x: 150, y: 80 },
    { x: 390, y: 65 },
    { x: 470, y: 250 },
    { x: 210, y: 285 },
  ];
  const points = polygon.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <main className="min-h-svh overflow-hidden bg-leaf text-leaf-foreground">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <Brand compact />
        <span className="rounded-full border border-leaf-foreground/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
          Leitura do território
        </span>
      </header>
      <section className="mx-auto grid min-h-[calc(100svh-84px)] max-w-[1180px] gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="eyebrow text-sun">{profile?.city ?? "Sua propriedade"}</p>
          <h1 className="display-soft mt-4 max-w-[10ch] text-[clamp(3.7rem,8vw,7rem)]">
            Olhando sua terra de cima.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-70">
            A área que você marcou orienta a leitura. Estamos organizando indicadores orbitais e o
            contexto informado na conversa. Só entram dados que alteram a comparação.
          </p>
          <div className="mt-8 space-y-3" aria-live="polite">
            {stages.map((item, index) => {
              const Icon = item.icon;
              const complete = index < stage;
              const active = index === stage;
              return (
                <div
                  key={item.label}
                  className={`analysis-stage ${active ? "analysis-stage-active" : ""}`}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-leaf-foreground/10">
                    {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="font-semibold">{item.label}</span>
                  {active ? <span className="analysis-pulse ml-auto" /> : null}
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs leading-relaxed opacity-55">
            Indicadores ambientais em modo de referência. A conexão operacional prevista combina
            POWER/IMERG, SMAP e regras agronômicas rastreáveis.
          </p>
        </div>
        <div className="orbital-scene" aria-hidden="true">
          <div className="satellite-orbit">
            <Satellite className="size-8" />
          </div>
          <div className="orbital-scan" />
          <svg viewBox="0 0 640 360" className="size-full">
            <path d="M-20 90 C150 30 210 150 390 86 S590 20 700 80" className="territory-road" />
            <path d="M80 390 C130 250 260 250 310 80 S470 0 610 -40" className="territory-stream" />
            <polygon points={points} className="territory-polygon territory-polygon-scan" />
          </svg>
          <span className="absolute bottom-5 left-5 rounded-full bg-paper/90 px-3 py-1.5 text-xs font-bold text-foreground">
            Área selecionada
          </span>
        </div>
      </section>
    </main>
  );
}

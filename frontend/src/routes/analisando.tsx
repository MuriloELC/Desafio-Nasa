import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Database, MapPinned, Satellite } from "lucide-react";
import { Brand } from "@/components/cereja-shell";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import { isStoredAnswers, type Answers } from "@/lib/onboarding";
import { diagnosis } from "@/lib/cereja-api";

export const Route = createFileRoute("/analisando")({
  head: () => ({
    meta: [
      { title: "Lendo seu território · Cerejá" },
      { name: "description", content: "Preparando a consulta regional do ponto informado." },
    ],
  }),
  component: AnalysingPage,
});

const stages = [
  { icon: MapPinned, label: "Ponto do talhão informado" },
  { icon: Satellite, label: "Consultando observações regionais" },
  { icon: Database, label: "Abrindo diagnóstico e calendário" },
];

function AnalysingPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let saved: unknown;
    try {
      saved = JSON.parse(localStorage.getItem(ANSWERS_STORAGE_KEY) ?? "null")?.answers;
    } catch {
      saved = null;
    }
    if (!isStoredAnswers(saved) || saved.latitude === null || saved.longitude === null) {
      void navigate({ to: "/chat" });
      return () => controller.abort();
    }
    setAnswers(saved);
    setError("");
    setStage(1);
    diagnosis(saved.latitude, saved.longitude, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          setStage(2);
          void navigate({ to: "/minha-terra" });
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Consulta indisponível.");
      });
    return () => controller.abort();
  }, [navigate, attempt]);

  const longitude = answers?.longitude;
  const latitude = answers?.latitude;
  const point =
    typeof latitude === "number" && typeof longitude === "number"
      ? { x: ((longitude + 61.65) / 0.4) * 640, y: ((-11.24 - latitude) / 0.4) * 360 }
      : null;

  return (
    <main className="analysis-page min-h-svh overflow-hidden font-sans">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <Brand compact />
        <span className="analysis-badge rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
          Leitura do território
        </span>
      </header>
      <section className="mx-auto grid min-h-[calc(100svh-84px)] max-w-[1180px] gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="eyebrow text-sun">{answers?.city ?? "Sua propriedade"}</p>
          <h1 className="landing-display mt-4 max-w-[10ch] text-[clamp(3.7rem,8vw,7rem)]">
            Olhando sua terra de cima.
          </h1>
          <p className="analysis-copy mt-5 max-w-xl text-lg leading-relaxed">
            O ponto que você marcou orienta a consulta. Na próxima tela, você verá as observações
            disponíveis e poderá completar os dados de campo para avaliar as candidatas.
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
                  <span className="analysis-stage-icon grid size-9 place-items-center rounded-full">
                    {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="font-semibold">{item.label}</span>
                  {active ? <span className="analysis-pulse ml-auto" /> : null}
                </div>
              );
            })}
          </div>
          {error ? (
            <div role="alert" className="analysis-error mt-5 rounded-xl p-4">
              <p>{error}</p>
              <div className="mt-3 flex gap-4">
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="font-bold underline"
                >
                  Tentar novamente
                </button>
                <Link to="/chat" className="font-bold underline">
                  Rever ponto
                </Link>
              </div>
            </div>
          ) : null}
          <p className="analysis-disclaimer mt-5 text-xs leading-relaxed">
            A consulta pode indicar dados ausentes ou períodos incompletos. A análise usa somente
            observações disponíveis e regras agronômicas revisadas.
          </p>
        </div>
        <div className="orbital-scene" aria-hidden="true">
          <div className="satellite-orbit">
            <Satellite className="size-8" />
          </div>
          <div className="orbital-scan" />
          <svg viewBox="0 0 640 360" className="size-full">
            {[0, 1, 2, 3, 4].map((index) => (
              <g key={index} stroke="currentColor" opacity="0.2">
                <line x1={index * 160} y1="0" x2={index * 160} y2="360" />
                <line x1="0" y1={index * 90} x2="640" y2={index * 90} />
              </g>
            ))}
            {point ? <circle cx={point.x} cy={point.y} r="12" className="territory-point" /> : null}
          </svg>
          <span className="analysis-point-label absolute bottom-5 left-5 rounded-full px-3 py-1.5 text-xs font-bold">
            Ponto selecionado
          </span>
        </div>
      </section>
    </main>
  );
}

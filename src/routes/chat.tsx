import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LocateFixed,
  MapPin,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import cherry from "@/assets/cut-1-cherry.png";
import bean from "@/assets/cut-4-bean.png";
import { ANSWERS_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/storage";
import { ANSWER_LABELS, quickReplies } from "@/lib/onboarding-ui";
import {
  CITIES,
  EMPTY_ANSWERS,
  QUESTIONS,
  TOTAL_QUESTIONS,
  answerText,
  calendarProfile,
  isStoredAnswers,
  updateAnswer,
  updateTerritory,
  validPositiveNumber,
  type Answers,
} from "@/lib/onboarding";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Converse sobre sua lavoura · Cerejá" },
      {
        name: "description",
        content: "Conte o que o satélite não conhece e compare coberturas para a entrelinha.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [ready, setReady] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ANSWERS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { answers?: unknown; step?: number };
        if (isStoredAnswers(saved.answers)) {
          setAnswers({ ...EMPTY_ANSWERS, ...saved.answers });
          setStep(Math.min(TOTAL_QUESTIONS, Math.max(0, Number(saved.step) || 0)));
        }
      }
    } catch {
      /* conversa funciona sem persistência */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify({ answers, step }));
      } catch {
        /* sem persistência */
      }
  }, [answers, ready, step]);
  useEffect(() => {
    setInput(editing ? answerText(step, answers).replace(/ (pés|ha)$/, "") : "");
    setError("");
    window.setTimeout(
      () => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      80,
    );
  }, [step, editing, answers]);

  const send = (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setError("Escreva uma resposta ou escolha “Não sei”.");
      return;
    }
    if (step === 5 && !validPositiveNumber(value.replace(/[^\d,.-]/g, ""))) {
      setError("Escolha uma opção ou informe a distância em metros.");
      return;
    }
    if (step === 1 && !value.endsWith("· RO")) {
      setError("Para continuar, escolha um município de Rondônia.");
      return;
    }
    setAnswers((current) => updateAnswer(current, step, value));
    setTyping(true);
    window.setTimeout(() => {
      setStep(editing ? TOTAL_QUESTIONS : Math.min(TOTAL_QUESTIONS, step + 1));
      setEditing(false);
      setTyping(false);
    }, 240);
  };
  const finish = () => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(calendarProfile(answers)));
    } catch {
      /* usa perfil padrão */
    }
    void navigate({ to: "/analisando" });
  };
  const locate = () => {
    setLocating(true);
    setLocationNote("");
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationNote("Localização indisponível. Escolha o município na lista.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        setLocationNote(
          "Localização aproximada recebida. Confirme o município na lista — não guardamos as coordenadas.",
        );
      },
      () => {
        setLocating(false);
        setLocationNote("Não foi possível localizar. Tudo bem: escolha o município abaixo.");
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  const suggestions =
    step === 1
      ? CITIES.filter((city) =>
          city
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(
              input
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase(),
            ),
        ).slice(0, 5)
      : [];
  const replies = quickReplies(step);

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={cherry} alt="" className="size-9" />
            <span className="brand text-xl">Cerejá</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">
              {Math.min(step + 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}
            </span>
          </div>
        </div>
        <div className="h-1 bg-border">
          <div
            className="h-full bg-cherry transition-[width] duration-500"
            style={{ width: `${(Math.min(step + 1, TOTAL_QUESTIONS) / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
      </header>
      <main className="mx-auto grid max-w-[1120px] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[300px_1fr] lg:py-12">
        <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
          <p className="eyebrow">Sua lavoura, do seu jeito</p>
          <h1 className="display-soft mt-4 text-5xl">Sua história encontra o seu território.</h1>
          <img
            src={bean}
            alt="Grão de café"
            className="fruit mx-auto mt-8 size-44 object-contain"
          />
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Primeiro você delimita a área. Depois cruzamos esse contexto com indicadores orbitais
            para explicar o que o solo pode precisar.
          </p>
        </aside>
        <section aria-label="Conversa sobre a lavoura" className="min-w-0">
          <div role="log" aria-live="polite" className="space-y-4">
            <BotMessage>
              Oi! Eu sou o Cerejá. Vamos entender seu cafezal e delimitar a área que será estudada.
            </BotMessage>
            {Array.from({ length: Math.min(step + 1, TOTAL_QUESTIONS) }, (_, index) => (
              <div key={index} className="space-y-3">
                <BotMessage>{QUESTIONS[index]}</BotMessage>
                {(index < step || (typing && index === step)) && answerText(index, answers) && (
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-leaf px-5 py-3 text-leaf-foreground">
                      {answerText(index, answers)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <p className="ml-12 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                Organizando sua resposta…
              </p>
            )}
          </div>
          {!typing && step < TOTAL_QUESTIONS && (
            <div className="mt-6 border-t border-border pt-5 sm:ml-12">
              {step === 1 && (
                <Button
                  variant="ghost"
                  onClick={locate}
                  disabled={locating}
                  className="mb-3 min-h-11 rounded-full border border-border"
                >
                  <LocateFixed />
                  {locating ? "Localizando…" : "Usar localização aproximada"}
                </Button>
              )}
              {locationNote && (
                <p role="status" className="mb-3 rounded-xl bg-card p-3 text-sm">
                  {locationNote}
                </p>
              )}
              {replies.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {replies.map((reply) => (
                    <Button
                      key={reply}
                      type="button"
                      variant="ghost"
                      onClick={() => send(reply)}
                      className="h-auto min-h-11 rounded-full border border-border px-4 py-2.5"
                    >
                      {reply}
                    </Button>
                  ))}
                </div>
              )}
              {step === 2 ? (
                <TerritoryPicker
                  initialPoints={answers.territoryPolygon}
                  onConfirm={(points) => {
                    setAnswers((current) => updateTerritory(current, points));
                    setTyping(true);
                    window.setTimeout(() => {
                      setStep(editing ? TOTAL_QUESTIONS : 3);
                      setEditing(false);
                      setTyping(false);
                    }, 240);
                  }}
                />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    send(input);
                  }}
                >
                  <label htmlFor="chat-answer" className="sr-only">
                    {ANSWER_LABELS[step]}
                  </label>
                  <div className="flex min-h-16 items-center gap-2 rounded-2xl border border-border bg-paper px-3 shadow-sm focus-within:ring-2 focus-within:ring-cherry">
                    <input
                      ref={field}
                      id="chat-answer"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      inputMode={step === 5 ? "decimal" : "text"}
                      autoComplete={step === 0 ? "given-name" : "off"}
                      placeholder={step === 1 ? "Digite para buscar em Rondônia" : "Sua resposta"}
                      className="min-w-0 flex-1 bg-transparent py-4 text-base outline-none"
                      aria-invalid={!!error}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Enviar resposta"
                      className="size-11 shrink-0 rounded-full bg-cherry text-primary-foreground"
                    >
                      <Send />
                    </Button>
                  </div>
                  {step === 1 && suggestions.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-paper">
                      {suggestions.map((city) => (
                        <button
                          type="button"
                          key={city}
                          onClick={() => send(city)}
                          className="flex min-h-12 w-full items-center justify-between border-b border-border px-4 text-left last:border-0 hover:bg-card"
                        >
                          {city}
                          <ArrowRight className="size-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm font-semibold text-cherry">
                  {error}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => {
                    setEditing(true);
                    setStep(Math.max(0, step - 1));
                  }}
                >
                  <ArrowLeft />
                  Voltar
                </Button>
                <span />
              </div>
            </div>
          )}
          {step === TOTAL_QUESTIONS && !typing && (
            <div className="mt-6 rounded-3xl border border-border bg-paper p-5 sm:p-7">
              <p className="eyebrow">Confirme antes de continuar</p>
              <h2 className="display-soft mt-2 text-4xl">Seu perfil</h2>
              <div className="mt-5 divide-y divide-border">
                {ANSWER_LABELS.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => {
                      setEditing(true);
                      setStep(index);
                    }}
                    className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left"
                  >
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="mt-1 block font-semibold">
                        {answerText(index, answers) || "Não informado"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-card p-4 text-sm leading-relaxed">
                <Check className="mr-2 inline size-4 text-leaf" />
                Suas respostas ficam salvas neste navegador e podem ser editadas quando quiser.
              </div>
              <Button
                onClick={finish}
                className="mt-5 min-h-14 w-full rounded-full bg-cherry text-base text-primary-foreground"
              >
                Analisar meu território <ArrowRight />
              </Button>
            </div>
          )}
          <div ref={end} />
        </section>
      </main>
    </div>
  );
}

function TerritoryPicker({
  initialPoints,
  onConfirm,
}: {
  initialPoints: Array<{ x: number; y: number }>;
  onConfirm: (points: Array<{ x: number; y: number }>) => void;
}) {
  const [points, setPoints] = useState(initialPoints);
  const serialized = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-paper shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-cherry" /> Delimite o talhão
        </span>
        <button
          type="button"
          onClick={() => setPoints([])}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-card"
        >
          <RotateCcw className="size-4" /> Limpar
        </button>
      </div>
      <svg
        viewBox="0 0 640 360"
        role="img"
        aria-label="Mapa para delimitar a área da propriedade"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = Math.round(((event.clientX - bounds.left) / bounds.width) * 640);
          const y = Math.round(((event.clientY - bounds.top) / bounds.height) * 360);
          setPoints((current) => [...current, { x, y }]);
        }}
        className="territory-map block w-full cursor-crosshair"
      >
        <path d="M-20 90 C150 30 210 150 390 86 S590 20 700 80" className="territory-road" />
        <path d="M80 390 C130 250 260 250 310 80 S470 0 610 -40" className="territory-stream" />
        {points.length >= 3 ? <polygon points={serialized} className="territory-polygon" /> : null}
        {points.map((point, index) => (
          <g key={`${point.x}-${point.y}-${index}`}>
            <circle cx={point.x} cy={point.y} r="9" className="territory-point" />
            <text x={point.x} y={point.y + 4} textAnchor="middle" className="territory-number">
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {points.length < 3
            ? `Marque pelo menos 3 pontos · ${points.length}/3`
            : `${points.length} pontos conectados. O desenho fica apenas neste navegador.`}
        </p>
        <Button
          type="button"
          disabled={points.length < 3}
          onClick={() => onConfirm(points)}
          className="min-h-12 rounded-full bg-cherry px-6 text-primary-foreground"
        >
          Confirmar área <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <img src={cherry} alt="" className="mt-1 size-8 shrink-0" />
      <p className="max-w-[90%] rounded-3xl rounded-tl-md bg-paper px-5 py-3 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

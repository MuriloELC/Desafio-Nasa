import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SatelliteMapCanvas } from "@/components/territory-map";
import bean from "@/assets/cut-4-bean.png";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import { ANSWER_LABELS, quickReplies } from "@/lib/onboarding-ui";
import {
  CITIES,
  EMPTY_ANSWERS,
  QUESTIONS,
  TOTAL_QUESTIONS,
  answerText,
  isStoredAnswers,
  parseFieldNumber,
  parseSpacingM,
  updateAnswer,
  updateTerritory,
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
    if (step === 5 && value !== "Não sei" && parseSpacingM(value) === null) {
      setError("Informe a distância em metros, entre 0,01 e 30, ou escolha Não sei.");
      return;
    }
    if (step === 4 && value !== "Não sei" && parseFieldNumber(value, 0, 100) === null) {
      setError("Informe a idade aproximada em anos, entre 0 e 100, ou escolha Não sei.");
      return;
    }
    if (step === 12 && value !== "Não tenho análise" && parseFieldNumber(value, 0, 14) === null) {
      setError("Informe um pH entre 0 e 14 obtido em análise local, ou escolha Não tenho análise.");
      return;
    }
    if (step === 1 && value !== "Cacoal · RO") {
      setError("Esta demonstração cobre somente o círculo de 20 km de Cacoal.");
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
  const finish = () => void navigate({ to: "/analisando" });
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
    <div className="onboarding-page">
      <header className="onb-top">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="onb-brand">
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
      <main className="onb-grid">
        <aside className="onb-intro">
          <p className="eyebrow">Sua lavoura, do seu jeito</p>
          <h1 className="display-soft mt-4 text-5xl">Sua história encontra o seu território.</h1>
          <img
            src={bean}
            alt="Grão de café"
            className="fruit mx-auto mt-8 size-44 object-contain"
          />
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Primeiro você marca um ponto do talhão. Depois mostramos as observações disponíveis e as
            regras que explicam a avaliação.
          </p>
        </aside>
        <section aria-label="Conversa sobre a lavoura" className="onb-chat">
          <div className="onb-chat-head">
            <div className="bot-info"><span className="bot-dot">✳</span><div><strong>Cerejá · Assistente</strong><small>Conversa sobre a sua terra</small></div></div>
            <span className="ui-label">Online</span>
          </div>
          <div role="log" aria-live="polite" className="onb-chat-content">
            <BotMessage>
              Oi! Eu sou o Cerejá. Vamos entender seu cafezal e marcar um ponto na área piloto.
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
                  initialPoint={
                    answers.latitude !== null && answers.longitude !== null
                      ? { lat: answers.latitude, lon: answers.longitude }
                      : null
                  }
                  onConfirm={(point) => {
                    setAnswers((current) => updateTerritory(current, point));
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
          <footer className="onb-foot"><span>Suas respostas ficam salvas neste navegador.</span><span>Dados reais · área piloto</span></footer>
        </section>
      </main>
    </div>
  );
}

function TerritoryPicker({
  initialPoint,
  onConfirm,
}: {
  initialPoint: { lat: number; lon: number } | null;
  onConfirm: (point: { lat: number; lon: number; x: number; y: number }) => void;
}) {
  const [lat, setLat] = useState(initialPoint?.lat.toFixed(5) ?? "");
  const [lon, setLon] = useState(initialPoint?.lon.toFixed(5) ?? "");
  const latitude = Number(lat.replace(",", "."));
  const longitude = Number(lon.replace(",", "."));
  const valid =
    lat.trim() !== "" &&
    lon.trim() !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const x = ((longitude + 61.65) / 0.4) * 640;
  const y = ((-11.24 - latitude) / 0.4) * 360;
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-paper shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-cherry" /> Marque um ponto do talhão
        </span>
        <button
          type="button"
          onClick={() => {
            setLat("");
            setLon("");
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-card"
        >
          <RotateCcw className="size-4" /> Limpar
        </button>
      </div>
      <SatelliteMapCanvas
        latitude={valid ? latitude : -11.4386}
        longitude={valid ? longitude : -61.4472}
        className="h-[360px]"
        showRadius={false}
        onSelect={(point) => {
          setLat(point.latitude.toFixed(5));
          setLon(point.longitude.toFixed(5));
        }}
      />
      <div className="grid gap-3 px-4 pt-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Latitude
          <input
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            inputMode="decimal"
            placeholder="-11,43860"
            className="mt-1 w-full rounded-xl border border-border bg-paper p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Longitude
          <input
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            inputMode="decimal"
            placeholder="-61,44720"
            className="mt-1 w-full rounded-xl border border-border bg-paper p-3"
          />
        </label>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Clique na imagem de satélite ou informe as coordenadas. A API confirma se o ponto está no
          raio de 20 km de Cacoal.
        </p>
        <Button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm({ lat: latitude, lon: longitude, x, y })}
          className="min-h-12 rounded-full bg-cherry px-6 text-primary-foreground"
        >
          Confirmar ponto <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="bot-bubble">{children}</p>
  );
}

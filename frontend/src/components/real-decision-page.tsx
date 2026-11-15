import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CloudRain,
  FlaskConical,
  Pencil,
  RefreshCcw,
  Scissors,
  Sprout,
  ThermometerSun,
} from "lucide-react";
import { AppPage } from "@/components/cereja-shell";
import { TerritoryMap } from "@/components/territory-map";
import type { Answers } from "@/lib/onboarding";
import { assessmentField, isStoredAnswers } from "@/lib/onboarding";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import {
  assessment,
  diagnosis,
  type Assessment,
  type Candidate,
  type FieldInput,
  type TerritoryMetric,
} from "@/lib/cereja-api";

const STATES: Record<Candidate["state"], string> = {
  favoravel: "Favorável para estudo",
  atencao: "Atenção às ressalvas",
  sem_dados: "Dados insuficientes",
  desfavoravel: "Desfavorável neste contexto",
};
const METRICS = {
  precip_30d_mm: { label: "Precipitação acumulada", icon: CloudRain, digits: 0 },
  temp_mean_30d_c: { label: "Temperatura média", icon: ThermometerSun, digits: 1 },
  soil_ph: { label: "pH regional do solo", icon: FlaskConical, digits: 1 },
} as const;
const STRATEGIES = [
  {
    key: "convencional",
    title: "Manejo convencional",
    subtitle: "Vegetação espontânea + palhada",
    icon: Scissors,
    text: "Mantém a vegetação já presente e preserva os resíduos após a roçada.",
  },
  {
    key: "permanente",
    title: "Cobertura permanente",
    subtitle: "Espécies de ciclo perene",
    icon: Sprout,
    text: "Prioriza candidatas capazes de permanecer na entrelinha, com manejo recorrente.",
  },
  {
    key: "rotacao",
    title: "Rotação de coberturas",
    subtitle: "Espécies anuais para compor ciclos",
    icon: RefreshCcw,
    text: "Prioriza espécies anuais para alternar raízes, biomassa e funções ao longo do tempo.",
  },
] as const;

function metricReading(item: TerritoryMetric) {
  if (item.value === null || item.baseline === null)
    return { label: "Sem comparação", tone: "neutral", detail: "Histórico insuficiente" };
  if (item.metric === "soil_ph") {
    const average = Math.abs(item.value - item.baseline) <= Math.max(item.spread ?? 0, 0.2);
    return {
      label: average ? "Na média regional" : "Fora da média regional",
      tone: average ? "ok" : "warn",
      detail: `Média SoilGrids na região: ${item.baseline.toFixed(1)} pH`,
    };
  }
  const tolerance = item.metric === "temp_mean_30d_c" ? 1.5 : Math.max(item.baseline * 0.2, 10);
  const delta = item.value - item.baseline;
  const average = Math.abs(delta) <= tolerance;
  return {
    label: average ? "Na média histórica" : `Fora do padrão · ${delta < 0 ? "abaixo" : "acima"}`,
    tone: average ? "ok" : "warn",
    detail: `Média de ${item.period_count} períodos anteriores: ${item.baseline.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${item.unit}`,
  };
}

function MetricCard({
  item,
  metric,
}: {
  item: TerritoryMetric | undefined;
  metric: TerritoryMetric["metric"];
}) {
  const meta = METRICS[metric];
  const reading = item ? metricReading(item) : null;
  const Icon = meta.icon;
  return (
    <article className="app-stat ui-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{meta.label}</p>
          <p className="mt-2 text-3xl font-bold">
            {item?.value == null
              ? "—"
              : item.value.toLocaleString("pt-BR", { maximumFractionDigits: meta.digits })}
            {item?.value != null ? <span className="ml-1 text-base">{item.unit}</span> : null}
          </p>
        </div>
        <span className="rounded-2xl bg-card p-3 text-cherry">
          <Icon className="size-6" />
        </span>
      </div>
      <span className={`metric-status mt-4 ${reading?.tone ?? "neutral"}`}>
        {reading?.label ?? "Indisponível"}
      </span>
      <p className="mt-3 text-sm text-muted-foreground">
        {reading?.detail ?? "Dado ainda não carregado."}
      </p>
      {item?.end_on ? (
        <p className="mt-1 text-xs text-muted-foreground">
          30 dias até {new Date(`${item.end_on}T12:00:00`).toLocaleDateString("pt-BR")} ·{" "}
          {item.source_id}
        </p>
      ) : item ? (
        <p className="mt-1 text-xs text-muted-foreground">Contexto regional · {item.source_id}</p>
      ) : null}
    </article>
  );
}

export function RealDecisionPage() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [diagnostic, setDiagnostic] = useState<Awaited<ReturnType<typeof diagnosis>> | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const [field, setField] = useState<FieldInput | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const evaluationVersion = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let saved: unknown;
    try {
      saved = JSON.parse(localStorage.getItem(ANSWERS_STORAGE_KEY) ?? "null")?.answers;
    } catch {
      saved = null;
    }
    if (!isStoredAnswers(saved) || saved.latitude === null || saved.longitude === null) {
      setLoading(false);
      return;
    }
    setAnswers(saved);
    setField(assessmentField(saved));
    diagnosis(saved.latitude, saved.longitude, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDiagnostic(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Consulta indisponível.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function changeField(patch: Partial<FieldInput>) {
    evaluationVersion.current += 1;
    setField((current) => (current ? { ...current, ...patch } : null));
    setResult(null);
    setSelected(null);
    setEvaluating(false);
    setError("");
  }
  async function evaluate() {
    if (
      !answers ||
      !field ||
      !diagnostic?.inside ||
      answers.latitude === null ||
      answers.longitude === null
    )
      return;
    const version = ++evaluationVersion.current;
    setEvaluating(true);
    setError("");
    try {
      const value = await assessment({ lat: answers.latitude, lon: answers.longitude, field });
      if (version === evaluationVersion.current) {
        setResult(value);
        setSelected(value.candidates[0]?.culture_id ?? null);
      }
    } catch (reason) {
      if (version === evaluationVersion.current)
        setError(reason instanceof Error ? reason.message : "Avaliação indisponível.");
    } finally {
      if (version === evaluationVersion.current) setEvaluating(false);
    }
  }
  const active = result?.candidates.find((item) => item.culture_id === selected);
  const cutoffRank = result?.ranking_available ? result.candidates[2]?.rank : undefined;
  const visibleCandidates = cutoffRank
    ? (result?.candidates.filter((item) => item.rank <= cutoffRank) ?? [])
    : (result?.candidates ?? []);
  const metric = (name: TerritoryMetric["metric"]) =>
    diagnostic?.summary?.find((item) => item.metric === name);

  return (
    <AppPage>
      <header className="app-section-intro">
        <p className="eyebrow">Minha Terra · Cacoal, RO</p>
        <h1 className="display-soft mt-3 text-5xl sm:text-7xl">Seu território, em contexto.</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Veja o ponto informado em imagem de satélite e compare o momento atual com o histórico
          local.
        </p>
      </header>
      {loading ? (
        <p role="status" className="py-8">
          Carregando território e indicadores…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="my-5 rounded-xl bg-cherry/10 p-4 text-cherry">
          {error}
        </p>
      ) : null}
      {!loading && !answers ? (
        <p className="py-8">Marque primeiro um ponto real da terra na conversa.</p>
      ) : null}
      {diagnostic && !diagnostic.inside ? (
        <p role="status" className="py-8">
          Diagnóstico indisponível fora da área piloto.
        </p>
      ) : null}
      {diagnostic?.inside ? (
        <>
          <section id="visao-geral" className="grid gap-5 py-8 lg:grid-cols-[1.45fr_0.75fr]">
            <TerritoryMap latitude={diagnostic.latitude} longitude={diagnostic.longitude} />
            <div className="grid gap-4">
              <MetricCard metric="precip_30d_mm" item={metric("precip_30d_mm")} />
              <MetricCard metric="temp_mean_30d_c" item={metric("temp_mean_30d_c")} />
              <MetricCard metric="soil_ph" item={metric("soil_ph")} />
            </div>
          </section>
          <p className="-mt-4 pb-8 text-sm text-muted-foreground">
            Ponto {diagnostic.latitude.toFixed(5)}, {diagnostic.longitude.toFixed(5)} · célula{" "}
            {diagnostic.cell_id} · malha de {diagnostic.cell_grid_km} km.
          </p>
          <section id="estrategias" className="border-t border-border py-8">
            <p className="eyebrow">Estratégia de entrelinha</p>
            <h2 className="display-soft mt-2 text-4xl">Três maneiras de cuidar das entrelinhas.</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Selecione primeiro o caminho de manejo. O motor usa essa escolha para limitar as
              candidatas; ela não substitui a validação agronômica.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {STRATEGIES.map(({ key, title, subtitle, text, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={field?.strategy === key}
                  onClick={() => changeField({ strategy: key })}
                  className={`strategy-choice rounded-3xl border p-6 text-left ${field?.strategy === key ? "selected" : ""}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="eyebrow">Estratégia</span>
                    <Icon className="size-6" />
                  </span>
                  <strong className="mt-5 block text-2xl">{title}</strong>
                  <b className="mt-2 block text-sm text-[#b9e7ca]">{subtitle}</b>
                  <span className="mt-3 block text-sm text-white/70">{text}</span>
                </button>
              ))}
            </div>
          </section>
          <section id="dados" className="decision-panel border-t border-border py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Informações da terra</p>
                <h2 className="display-soft mt-2 text-4xl">Dados que mudam a avaliação</h2>
              </div>
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-semibold"
              >
                <Pencil className="size-4" /> Alterar perfil e localização
              </Link>
            </div>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Ajuste os campos abaixo. O pH da análise local tem prioridade; se ficar vazio, o motor
              usa a estimativa regional do SoilGrids mostrada acima.
            </p>
            <div className="decision-field-grid mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FieldSelect
                label="Fase do café"
                value={field?.phase}
                onChange={(value) => changeField({ phase: value as FieldInput["phase"] })}
                options={[
                  ["implantacao", "Implantação"],
                  ["formacao", "Formação"],
                  ["producao", "Produção"],
                  ["recepa", "Recepa"],
                ]}
              />
              <FieldSelect
                label="Regime hídrico"
                value={field?.water}
                onChange={(value) => changeField({ water: value as FieldInput["water"] })}
                options={[
                  ["sequeiro", "Sequeiro"],
                  ["irrigado", "Irrigado"],
                ]}
              />
              <NumberField
                label="Idade do café (anos)"
                value={field?.age_years}
                min={0}
                max={100}
                onChange={(value) => changeField({ age_years: value })}
              />
              <NumberField
                label="Espaçamento entre linhas (m)"
                value={field?.spacing_m}
                min={0.01}
                max={30}
                step={0.1}
                onChange={(value) => changeField({ spacing_m: value })}
              />
              <NumberField
                label="pH da análise local"
                value={field?.soil_ph}
                min={0}
                max={14}
                step={0.1}
                onChange={(value) => changeField({ soil_ph: value })}
              />
              <BooleanField
                label="Consegue manejar regularmente"
                value={field?.can_manage}
                onChange={(value) => changeField({ can_manage: value })}
              />
            </div>
            <button
              type="button"
              disabled={evaluating || !field?.strategy}
              onClick={() => void evaluate()}
              className="mt-6 rounded-full bg-cherry px-6 py-4 font-bold text-primary-foreground disabled:opacity-50"
            >
              {evaluating
                ? "Avaliando…"
                : field?.strategy
                  ? "Avaliar espécies"
                  : "Escolha uma estratégia"}
            </button>
          </section>
        </>
      ) : null}
      {result?.inside ? (
        <section id="impacto" className="border-t border-border py-8">
          <h2 className="display-soft text-4xl">
            {result.candidates.length
              ? result.ranking_available
                ? `${visibleCandidates.length} candidatas melhor posicionadas`
                : "Candidatas empatadas tecnicamente"
              : "Manejo sem implantação obrigatória"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {result.ranking_available
              ? "A ordem considera suas respostas, o objetivo de manejo, as faixas técnicas e as regras publicadas. Empates na última posição são mantidos."
              : "Com as respostas atuais, essas espécies obtiveram a mesma posição técnica; nenhuma foi favorecida pela ordem alfabética."}
          </p>
          {!result.candidates.length ? (
            <p className="mt-5 rounded-3xl border border-border bg-paper p-6">
              Na estratégia convencional, o motor orienta preservar a vegetação espontânea e a
              palhada. Nenhuma espécie é indicada para plantio automático.
            </p>
          ) : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleCandidates.map((item) => (
              <button
                type="button"
                key={item.culture_id}
                onClick={() => setSelected(item.culture_id)}
                aria-pressed={selected === item.culture_id}
                className={`candidate-card ${selected === item.culture_id ? "selected" : ""}`}
              >
                <span className="eyebrow">{STATES[item.state]}</span>
                <strong className="mt-2 block text-xl">{item.name}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Posição {item.rank}
                  {item.tie ? " (empate)" : ""} · confiança {item.confidence}
                </span>
                <span className="mt-3 block text-sm">{item.reasons.join(" ")}</span>
              </button>
            ))}
          </div>
          {active ? (
            <article id="plano" className="plan-sheet mt-5">
              <h3 className="text-2xl font-semibold">{active.name}: leitura atual</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {active.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {active.missing.length ? (
                <p className="mt-4">
                  <strong>Antes de agir, verificar:</strong> {active.missing.join("; ")}.
                </p>
              ) : null}
            </article>
          ) : null}
        </section>
      ) : null}
    </AppPage>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: string[][];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="font-semibold">
      {label}
      <select
        className="onb-input mt-2 block w-full rounded-xl border border-border bg-paper p-3"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Não sei</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="font-semibold">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        className="onb-input mt-2 block w-full rounded-xl border border-border bg-paper p-3"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}
function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <label className="font-semibold">
      {label}
      <select
        className="onb-input mt-2 block w-full rounded-xl border border-border bg-paper p-3"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "true")}
      >
        <option value="">Não sei</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    </label>
  );
}

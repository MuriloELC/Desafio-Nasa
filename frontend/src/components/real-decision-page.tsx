import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppPage } from "@/components/cereja-shell";
import type { Answers } from "@/lib/onboarding";
import { assessmentField, isStoredAnswers, supportsPilotCoffee } from "@/lib/onboarding";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import {
  assessment,
  calendar,
  diagnosis,
  evidence,
  EVIDENCE_LABEL,
  type Assessment,
  type Calendar,
  type Candidate,
  type Diagnosis,
  type FieldInput,
  type Observation,
} from "@/lib/cereja-api";

const MONTHS: Record<number, string> = {
  1: "Jan",
  2: "Fev",
  3: "Mar",
  4: "Abr",
  5: "Mai",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Set",
  10: "Out",
  11: "Nov",
  12: "Dez",
};
const METRICS: Record<string, string> = {
  precip_power_mm: "Chuva POWER",
  precip_mm: "Chuva IMERG",
  temp_mean_c: "Temperatura média",
  humidity_pct: "Umidade do ar",
  soil_ph: "pH regional do solo",
  clay_pct: "Argila regional",
};
const STATES: Record<Candidate["state"], string> = {
  favoravel: "Favorável para estudo",
  atencao: "Atenção às ressalvas",
  sem_dados: "Dados insuficientes",
  desfavoravel: "Desfavorável neste contexto",
};

function ObservationCard({ item }: { item: Observation }) {
  return (
    <article className="rounded-3xl border border-border bg-paper p-5">
      <p className="eyebrow">
        {EVIDENCE_LABEL[evidence(item.value, "observado").status]} · {item.source_id}
      </p>
      <h3 className="mt-2 text-xl font-semibold">{METRICS[item.metric] ?? item.metric}</h3>
      <p className="mt-3 text-3xl font-bold">
        {Number(item.value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
        <span className="text-base">{item.unit}</span>
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {item.observed_on ? `Data: ${item.observed_on} · ` : ""}Resolução: {item.native_resolution}{" "}
        · Qualidade: {item.quality}
      </p>
      {item.depth_bottom_cm ? (
        <p className="text-sm text-muted-foreground">
          Profundidade: {item.depth_top_cm}–{item.depth_bottom_cm} cm. Estimativa regional; não
          substitui análise do talhão.
        </p>
      ) : null}
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-semibold text-cherry underline"
      >
        Fonte: {item.product}
      </a>
    </article>
  );
}

export function RealDecisionPage() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnosis | null>(null);
  const [schedule, setSchedule] = useState<Calendar | null>(null);
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
      .then(async (data) => {
        if (controller.signal.aborted) return;
        setDiagnostic(data);
        if (data.inside) setSchedule(await calendar(data.municipality, controller.signal));
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
      !supportsPilotCoffee(answers.coffee) ||
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
  const supportedCoffee = answers !== null && supportsPilotCoffee(answers.coffee);
  return (
    <AppPage>
      <header className="border-b border-border pb-8">
        <p className="eyebrow">Minha Terra · Cacoal, RO</p>
        <h1 className="display-soft mt-3 text-5xl sm:text-7xl">Sua entrelinha, com evidências.</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Compare coberturas para o café usando o contexto informado e observações regionais.
          Confirme a escolha no talhão e com assistência técnica.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Área piloto: círculo de 20 km da sede de Cacoal, não o limite do município.
        </p>
        <Link
          to="/chat"
          className="mt-5 inline-block rounded-full border border-border px-5 py-3 font-semibold"
        >
          Rever respostas e ponto
        </Link>
      </header>
      {loading ? (
        <p role="status" className="py-8">
          Consultando observações e calendário…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="my-5 rounded-xl bg-cherry/10 p-4 text-cherry">
          {error}
        </p>
      ) : null}
      {!loading && !answers ? (
        <p className="py-8">Marque primeiro um ponto real do talhão na conversa.</p>
      ) : null}
      {diagnostic && !diagnostic.inside ? (
        <p role="status" className="py-8">
          Diagnóstico indisponível fora da área piloto. Escolha um ponto dentro do raio de Cacoal.
        </p>
      ) : null}
      {diagnostic?.inside ? (
        <>
          <section className="py-8">
            <h2 className="display-soft text-4xl">O que foi observado</h2>
            <p className="mt-2 text-muted-foreground">
              Ponto {diagnostic.latitude.toFixed(5)}, {diagnostic.longitude.toFixed(5)} · malha de{" "}
              {diagnostic.cell_grid_km} km · {diagnostic.cell_id}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...diagnostic.daily, ...diagnostic.static].map((item) => (
                <ObservationCard
                  key={`${item.source_id}-${item.metric}-${item.depth_top_cm ?? 0}`}
                  item={item}
                />
              ))}
            </div>
            {diagnostic.missing.length ? (
              <p className="mt-5 rounded-xl bg-card p-4">
                {EVIDENCE_LABEL.indisponivel} nesta célula: {diagnostic.missing.join(", ")}.
              </p>
            ) : null}
            {!diagnostic.static.some((item) => item.metric === "soil_ph") ? (
              <p className="mt-3 text-sm text-muted-foreground">
                SoilGrids ainda não carregado nesta célula. Informe pH apenas se tiver análise do
                talhão.
              </p>
            ) : null}
          </section>
          <section className="border-t border-border py-8">
            <h2 className="display-soft text-4xl">Complete a leitura de campo</h2>
            <p className="mt-2 text-muted-foreground">
              As informações abaixo são declaradas por você. Campos em branco aparecem como dados
              faltantes na avaliação.
            </p>
            <p className="mt-2 text-sm font-semibold">
              {EVIDENCE_LABEL[evidence(field?.phase, "informado").status]}: fase do café ·{" "}
              {EVIDENCE_LABEL[evidence(field?.soil_ph, "informado").status]}: pH local
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="font-semibold">
                Fase do café
                <select
                  className="mt-2 block w-full rounded-xl border border-border bg-paper p-3"
                  value={field?.phase ?? ""}
                  onChange={(event) =>
                    changeField({ phase: (event.target.value as FieldInput["phase"]) || null })
                  }
                >
                  <option value="">Não sei</option>
                  <option value="implantacao">Implantação</option>
                  <option value="formacao">Formação</option>
                  <option value="producao">Produção</option>
                  <option value="recepa">Recepa</option>
                </select>
              </label>
              <label className="font-semibold">
                Regime hídrico
                <select
                  className="mt-2 block w-full rounded-xl border border-border bg-paper p-3"
                  value={field?.water ?? ""}
                  onChange={(event) =>
                    changeField({ water: (event.target.value as FieldInput["water"]) || null })
                  }
                >
                  <option value="">Não sei</option>
                  <option value="sequeiro">Sequeiro</option>
                  <option value="irrigado">Irrigado</option>
                </select>
              </label>
              <label className="font-semibold">
                pH da análise local (opcional)
                <input
                  type="number"
                  min="0"
                  max="14"
                  step="0.1"
                  className="mt-2 block w-full rounded-xl border border-border bg-paper p-3"
                  value={field?.soil_ph ?? ""}
                  onChange={(event) =>
                    changeField({
                      soil_ph: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(
                [
                  ["nematodes", "Histórico de nematoides"],
                  ["can_manage", "Consegue manejar a cobertura regularmente"],
                  ["soil_assessed", "Fertilidade avaliada no talhão"],
                  ["moisture_checked", "Umidade verificada em campo"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="font-semibold">
                  {label}
                  <select
                    className="mt-2 block w-full rounded-xl border border-border bg-paper p-3"
                    value={field?.[key] === null ? "" : String(field?.[key])}
                    onChange={(event) =>
                      changeField({
                        [key]: event.target.value === "" ? null : event.target.value === "true",
                      })
                    }
                  >
                    <option value="">Não sei</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={evaluating || !supportedCoffee}
              onClick={() => void evaluate()}
              className="mt-6 rounded-full bg-cherry px-6 py-4 font-bold text-primary-foreground disabled:opacity-50"
            >
              {evaluating ? "Avaliando…" : "Comparar candidatas"}
            </button>
            {!supportedCoffee ? (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                O catálogo atual foi revisado para café Canéfora (Robusta/Conilon). Informe essa
                cultura para comparar candidatas; os dados climáticos acima continuam disponíveis
                para estudo.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
      {result?.inside ? (
        <section className="border-t border-border py-8">
          <h2 className="display-soft text-4xl">Candidatas para estudar</h2>
          <p className="mt-2 text-muted-foreground">
            Método {result.method_version} · referência {result.reference_date}. A ordem indica
            avaliação de critérios, não prescrição de plantio.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.candidates.map((item) => (
              <button
                type="button"
                key={item.culture_id}
                onClick={() => setSelected(item.culture_id)}
                aria-pressed={selected === item.culture_id}
                className={`rounded-3xl border p-5 text-left ${selected === item.culture_id ? "border-cherry bg-card" : "border-border bg-paper"}`}
              >
                <span className="eyebrow">{STATES[item.state]}</span>
                <strong className="mt-2 block text-xl">{item.name}</strong>
                <span className="mt-3 block text-sm">{item.reasons.join(" ")}</span>
              </button>
            ))}
          </div>
          {active ? (
            <article className="mt-5 rounded-3xl border border-border bg-paper p-6">
              <h3 className="text-2xl font-semibold">{active.name}: por que estudar?</h3>
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
              <div className="mt-4 space-y-1">
                {active.sources.map((source, index) => (
                  <p key={`${source.url}-${index}`} className="text-sm">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-cherry underline"
                    >
                      {source.title}
                    </a>{" "}
                    · {source.detail ?? "Referência técnica"} · versão{" "}
                    {source.rule_version ?? source.requirement_version ?? "-"}
                  </p>
                ))}
              </div>
            </article>
          ) : null}
          <details className="mt-6 rounded-2xl border border-border p-4">
            <summary className="cursor-pointer font-semibold">
              Cobertura dos períodos climáticos
            </summary>
            <div className="mt-3 grid gap-2">
              {result.coverage?.map((row, index) => (
                <p key={index} className="text-sm">
                  {row.source_id} · {row.metric} · {row.start_on} a {row.end_on}:{" "}
                  {row.days_available}/{row.days_expected} dias{" "}
                  {row.value === null ? "· incompleto, fora da avaliação" : "· período completo"}
                </p>
              ))}
            </div>
          </details>
        </section>
      ) : null}
      {schedule ? (
        <section className="border-t border-border py-8">
          <h2 className="display-soft text-4xl">
            Calendário técnico · {EVIDENCE_LABEL.referencia}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Safra {schedule.year}/{schedule.year + 1}. Orientações de referência, sujeitas ao
            contexto do talhão.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schedule.months.map((month) => (
              <article key={month} className="rounded-2xl border border-border bg-paper p-4">
                <h3 className="text-xl font-semibold">{MONTHS[month]}</h3>
                {schedule.rules
                  .filter((rule) => rule.months.includes(month))
                  .map((rule) => (
                    <p key={`${rule.rule_id}-${rule.version}`} className="mt-2 text-sm">
                      <strong>
                        {schedule.cultures.find((culture) => culture.culture_id === rule.culture_id)
                          ?.name ?? rule.culture_id}{" "}
                        · {rule.activity}
                      </strong>
                      <br />
                      {rule.orientation}
                      <br />
                      {rule.starts_on && rule.ends_on
                        ? `Janela: ${rule.starts_on} a ${rule.ends_on}`
                        : `Meses de referência: ${rule.months.map((value) => MONTHS[value]).join(", ")}`}
                      {` · Escopo: ${rule.municipality ?? rule.uf ?? "geral"}`}
                      <br />
                      <a
                        href={rule.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cherry underline"
                      >
                        {rule.source.title} · v{rule.version}
                      </a>
                      {rule.source_detail ? ` · ${rule.source_detail}` : ""}
                    </p>
                  ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AppPage>
  );
}

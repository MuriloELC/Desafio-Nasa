import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Droplets,
  ExternalLink,
  Leaf,
  MapPinned,
  Satellite,
  ShieldCheck,
  Sprout,
  Printer,
} from "lucide-react";
import { AppPage } from "@/components/cereja-shell";
import { InfoTerm } from "@/components/info-term";
import {
  DEMO_FARMS,
  contextFromProfile,
  type Evidence,
  type FarmContext,
} from "@/demo/decision-demo";
import type { FarmProfile } from "@/demo/cereja-demo";
import { evaluateStrategies, type StrategyId, type StrategyResult } from "@/lib/decision-engine";
import { readProfile } from "@/lib/calendar-model";
import { PROFILE_STORAGE_KEY } from "@/lib/storage";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Minha Terra · Cerejá" },
      {
        name: "description",
        content: "Compare estratégias de cobertura da entrelinha e entenda cada trade-off.",
      },
    ],
  }),
  component: LandDecisionPage,
});

const suitabilityStyles = {
  study: "bg-bean/25 text-leaf",
  conditional: "bg-sun/25 text-foreground",
  low: "bg-cherry/10 text-cherry",
  insufficient: "bg-card text-muted-foreground",
} as const;

export function LandDecisionPage() {
  const [context, setContext] = useState<FarmContext>(DEMO_FARMS[0]!);
  const [userContext, setUserContext] = useState<FarmContext | null>(null);
  const results = useMemo(() => evaluateStrategies(context), [context]);
  const [activeId, setActiveId] = useState<StrategyId>("managed");
  const active = results.find((item) => item.id === activeId) ?? results[0]!;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;
      const profile = readProfile(JSON.parse(raw)) as FarmProfile;
      const next = contextFromProfile(profile);
      setUserContext(next);
      setContext(next);
      setActiveId(evaluateStrategies(next)[0]!.id);
    } catch {
      /* usa o primeiro cenário demonstrativo */
    }
  }, []);

  const chooseContext = (next: FarmContext) => {
    setContext(next);
    setActiveId(evaluateStrategies(next)[0]!.id);
  };

  return (
    <AppPage>
      <header className="border-b border-border pb-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Decisão sobre a entrelinha</p>
            <h1 className="display-soft mt-3 text-5xl sm:text-7xl">
              Como proteger melhor este talhão?
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              O Cerejá combina o que você informou com sinais ambientais regionais para comparar
              alternativas — sem esconder riscos nem escolher por você.
            </p>
          </div>
          <Link
            to="/chat"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-paper px-5 font-semibold"
          >
            Redefinir talhão <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Talhão analisado">
          {userContext ? (
            <ContextButton
              active={context.id === userContext.id}
              onClick={() => chooseContext(userContext)}
            >
              Meu talhão
            </ContextButton>
          ) : (
            DEMO_FARMS.map((farm) => (
              <ContextButton
                key={farm.id}
                active={context.id === farm.id}
                onClick={() => chooseContext(farm)}
              >
                Exemplo · {farm.city.replace(" · RO", "")}
              </ContextButton>
            ))
          )}
          <span className="ml-auto">
            <InfoTerm label="Sobre esta leitura">
              Os indicadores ambientais estão em modo de referência, sem consulta ao vivo. Respostas
              do produtor e regras funcionam localmente neste navegador.
            </InfoTerm>
          </span>
        </div>
      </header>

      <section className="py-8" aria-labelledby="area-title">
        <div className="decision-hero">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-cherry">
              <MapPinned className="size-4" /> {context.name} · {context.city}
            </span>
            <h2 id="area-title" className="display-soft mt-4 max-w-[13ch] text-4xl sm:text-6xl">
              {context.waterRisk === "high" && context.irrigation === "none"
                ? "Atravesse a seca sem deixar o solo nu."
                : "Feche o solo antes que a chuva forte encontre a entrelinha."}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {context.waterRisk === "high" && context.irrigation === "none"
                ? "O sinal hídrico regional pede cobertura, mas também cautela com vegetação viva competindo por água entre junho e agosto."
                : "A irrigação declarada e a alta exposição tornam uma cobertura contínua mais viável, desde que a altura e a faixa junto ao café sejam manejadas."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-card px-3 py-2">{context.coffeeType}</span>
              <span className="rounded-full bg-card px-3 py-2">
                {context.rowSpacingM} m entre linhas
              </span>
              <span className="rounded-full bg-card px-3 py-2">
                {context.irrigation === "none" ? "Sem irrigação" : "Com irrigação"}
              </span>
            </div>
          </div>
          <TerritorySignal context={context} />
        </div>
      </section>

      <section className="border-t border-border py-8" aria-labelledby="evidence-title">
        <SectionHeading
          eyebrow="Da fonte à decisão"
          title="O que mudou a avaliação."
          description="Cada sinal só aparece porque altera uma regra. Abra o detalhe para ver resolução, origem e limite."
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {context.evidence.map((evidence) => (
            <EvidenceCard key={evidence.id} evidence={evidence} />
          ))}
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <FlowStep icon={Satellite} label="Sinal regional" />
          <ChevronRight className="mx-auto hidden size-5 text-muted-foreground md:block" />
          <FlowStep icon={Database} label="Regra rastreável" />
          <ChevronRight className="mx-auto hidden size-5 text-muted-foreground md:block" />
          <FlowStep icon={Sprout} label="Estratégia com ressalvas" />
        </div>
      </section>

      <section className="border-t border-border py-8" aria-labelledby="strategies-title">
        <SectionHeading
          eyebrow="Alternativas para a entrelinha"
          title="Não existe uma cobertura universal."
          description="Compare adequação, benefício e risco para este contexto. A primeira opção é prioridade de estudo, não uma prescrição."
        />
        <div
          className="mt-7 grid gap-4 lg:grid-cols-3"
          role="radiogroup"
          aria-label="Estratégias de cobertura"
        >
          {results.map((strategy, index) => (
            <button
              key={strategy.id}
              type="button"
              role="radio"
              aria-checked={active.id === strategy.id}
              onClick={() => setActiveId(strategy.id)}
              className={`decision-strategy ${active.id === strategy.id ? "decision-strategy-active" : ""}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] opacity-60">
                  Alternativa {index + 1}
                </span>
                {active.id === strategy.id ? <Check className="size-5" /> : null}
              </span>
              <strong className="mt-7 block text-2xl leading-tight">{strategy.title}</strong>
              <span className="mt-2 block text-sm opacity-65">{strategy.example}</span>
              <span
                className={`mt-6 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${suitabilityStyles[strategy.suitability]}`}
              >
                {strategy.suitabilityLabel}
              </span>
              <span className="mt-5 block text-sm leading-relaxed opacity-75">
                {strategy.summary}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-8" aria-labelledby="signature-title">
        <SectionHeading
          eyebrow="Comparação visual"
          title="O que muda se eu escolher esta cobertura?"
          description="A escolha altera proteção, competição, manejo e a forma de atravessar a seca. O clima da área continua o mesmo."
        />
        <div key={active.id} className="detail-in mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SoilDecisionScene strategy={active} />
          <div className="space-y-4">
            <article className="rounded-3xl border border-border bg-paper p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${suitabilityStyles[active.suitability]}`}
                >
                  {active.suitabilityLabel}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {active.example}
                </span>
              </div>
              <h3 className="mt-6 text-3xl font-semibold">Por que aparece para este talhão</h3>
              <ul className="mt-4 space-y-3">
                {active.why.map((reason) => (
                  <li key={reason} className="flex gap-3 leading-relaxed">
                    <Check className="mt-1 size-4 shrink-0 text-leaf" /> {reason}
                  </li>
                ))}
              </ul>
            </article>
            <div className="grid gap-4 sm:grid-cols-2">
              <DecisionList
                icon={ShieldCheck}
                title="Benefícios esperados"
                items={active.benefits}
                tone="positive"
              />
              <DecisionList
                icon={CircleAlert}
                title="Riscos a controlar"
                items={active.risks}
                tone="warning"
              />
            </div>
            <article className="rounded-3xl bg-leaf p-6 text-leaf-foreground">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun">
                Trade-off dominante
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <strong className="text-xl">Mais {active.tradeoff.gain}</strong>
                <span className="text-center text-2xl opacity-45">↔</span>
                <strong className="text-xl">Mais {active.tradeoff.cost}</strong>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-8" aria-labelledby="time-title">
        <SectionHeading
          eyebrow="Decisão no tempo"
          title="A cobertura muda ao longo do ciclo."
          description={active.management}
        />
        <div className="mt-7 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {active.phases.map((phase, index) => (
            <article key={phase.label} className="bg-paper p-5">
              <span className="text-xs font-bold tracking-[0.14em] text-cherry">0{index + 1}</span>
              <p className="mt-8 text-sm font-semibold text-muted-foreground">{phase.label}</p>
              <h3 className="mt-1 text-xl font-semibold">{phase.action}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{phase.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-8" aria-labelledby="proof-title">
        <SectionHeading
          eyebrow="Evidências da escolha"
          title="Por que o Cerejá chegou aqui."
          description="O produtor vê a explicação simples; o técnico pode abrir fonte, escala e limitação."
        />
        <div className="mt-6 space-y-3">
          {active.evidence.map((evidence) => (
            <EvidenceRow key={evidence.id} evidence={evidence} />
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-3xl bg-cherry p-6 text-primary-foreground sm:p-9">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-70">
              Próximo passo seguro
            </p>
            <h2 className="display-soft mt-3 max-w-[14ch] text-4xl sm:text-6xl">
              Leve esta comparação para o talhão.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed opacity-75">
              Confirme umidade, cobertura real, histórico de nematoides e capacidade de manejo com
              assistência técnica antes de escolher espécie ou implantar.
            </p>
          </div>
          <div className="flex flex-col gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-paper px-6 font-semibold text-foreground"
            >
              <Printer className="size-4" /> Imprimir plano de campo
            </button>
            <Link
              to="/aprender"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary-foreground/25 px-6 font-semibold"
            >
              Entender os termos <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </AppPage>
  );
}

function ContextButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${active ? "border-leaf bg-leaf text-leaf-foreground" : "border-border bg-paper"}`}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-soft mt-2 text-3xl sm:text-5xl">{title}</h2>
      </div>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function TerritorySignal({ context }: { context: FarmContext }) {
  return (
    <div className="relative min-h-80 overflow-hidden rounded-3xl bg-leaf text-leaf-foreground">
      <div className="orbital-scan" />
      <svg
        viewBox="0 0 520 340"
        className="absolute inset-0 size-full opacity-65"
        aria-hidden="true"
      >
        <path d="M-20 90 C130 20 220 160 390 75 S560 10 620 80" className="territory-road" />
        <path d="M60 380 C130 210 250 250 300 70 S430 10 560 -40" className="territory-stream" />
        <polygon
          points="120,95 350,70 430,245 230,290 95,220"
          className="territory-polygon territory-polygon-scan"
        />
      </svg>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-paper/90 p-5 text-foreground backdrop-blur">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-cherry">
          Sinal que mais pesa agora
        </span>
        <strong className="mt-2 block text-xl">
          {context.waterRisk === "high"
            ? "Água mais restrita na seca"
            : "Solo exposto diante de chuva forte"}
        </strong>
        <p className="mt-2 text-sm text-muted-foreground">
          Isso muda a ressalva e a prioridade entre as coberturas.
        </p>
      </div>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <article className="rounded-3xl border border-border bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${evidence.kind === "nasa" ? "bg-leaf text-leaf-foreground" : "bg-card"}`}
        >
          {evidence.status === "simulated"
            ? "NASA · referência"
            : evidence.status === "informed"
              ? "Informado"
              : "Referência"}
        </span>
        <InfoTerm label="">
          <p>{evidence.technicalDetail}</p>
          <p className="mt-2 text-xs opacity-70">{evidence.resolution ?? evidence.source}</p>
        </InfoTerm>
      </div>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">{evidence.label}</p>
      <strong className="mt-1 block text-2xl">{evidence.value}</strong>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{evidence.plainLanguage}</p>
      <p className="mt-4 border-t border-border pt-3 text-xs font-semibold text-cherry">
        Muda: {evidence.changes}
      </p>
    </article>
  );
}

function FlowStep({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-card px-4 font-semibold">
      <Icon className="size-5 text-cherry" />
      {label}
    </div>
  );
}

function SoilDecisionScene({ strategy }: { strategy: StrategyResult }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-paper">
      <div
        className="decision-soil"
        style={{ "--cover-density": `${strategy.visualDensity}%` } as React.CSSProperties}
      >
        <div className="decision-sky">
          <Droplets className="absolute right-6 top-6 size-7 text-blue-700/55" />
        </div>
        <div className="decision-cover" />
        {Array.from(
          { length: strategy.visualDensity > 70 ? 12 : strategy.visualDensity > 50 ? 8 : 5 },
          (_, index) => (
            <span
              key={index}
              className="decision-plant"
              style={{
                left: `${7 + index * (86 / (strategy.visualDensity > 70 ? 12 : strategy.visualDensity > 50 ? 8 : 5))}%`,
                height: `${30 + (index % 3) * 10}px`,
              }}
            />
          ),
        )}
        <div className="decision-earth" />
        <div className={`decision-roots decision-roots-${strategy.rootDepth}`} />
      </div>
      <div className="p-6">
        <p className="eyebrow">Perfil ilustrativo</p>
        <h3 className="mt-2 text-3xl font-semibold">{strategy.title}</h3>
        <p className="mt-3 text-muted-foreground">
          A ilustração muda para tornar visível o trade-off. Não representa medição do talhão.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <span className="rounded-2xl bg-card p-3">
            <Leaf className="mb-2 size-4 text-leaf" />
            <strong>
              {strategy.visualDensity > 70
                ? "Cobertura contínua"
                : strategy.visualDensity > 50
                  ? "Cobertura por ciclo"
                  : "Cobertura variável"}
            </strong>
          </span>
          <span className="rounded-2xl bg-card p-3">
            <Droplets className="mb-2 size-4 text-cherry" />
            <strong>
              {strategy.id === "permanent" ? "Competição a manejar" : "Competição reduzida na seca"}
            </strong>
          </span>
        </div>
      </div>
    </article>
  );
}

function DecisionList({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  tone: "positive" | "warning";
}) {
  return (
    <article
      className={`rounded-3xl border p-5 ${tone === "positive" ? "border-bean/35 bg-bean/10" : "border-sun/50 bg-sun/10"}`}
    >
      <Icon className="size-5" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </article>
  );
}

function EvidenceRow({ evidence }: { evidence: Evidence }) {
  return (
    <details className="group rounded-2xl border border-border bg-paper">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-5">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${evidence.kind === "nasa" ? "bg-leaf text-leaf-foreground" : "bg-card"}`}
        >
          {evidence.kind === "nasa" ? (
            <Satellite className="size-4" />
          ) : (
            <Leaf className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block">{evidence.source}</strong>
          <span className="block truncate text-sm text-muted-foreground">{evidence.changes}</span>
        </span>
        <ArrowDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        <p>{evidence.technicalDetail}</p>
        {evidence.resolution ? (
          <p className="mt-2">
            <strong>Escala:</strong> {evidence.resolution}. Não equivale a uma medição dentro da
            entrelinha.
          </p>
        ) : null}
        {evidence.sourceUrl ? (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-semibold text-cherry"
          >
            Abrir fonte <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </details>
  );
}

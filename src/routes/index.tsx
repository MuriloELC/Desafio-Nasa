import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPinned, Satellite, Sprout } from "lucide-react";
import { Brand } from "@/components/cereja-shell";
import cherry from "@/assets/cut-1-cherry.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cerejá · o solo do seu cafezal visto por inteiro" },
      {
        name: "description",
        content:
          "Compare estratégias de cobertura da entrelinha com contexto do cafezal e evidências NASA.",
      },
      { property: "og:title", content: "Cerejá · da órbita para a sua terra" },
      {
        property: "og:description",
        content: "Alternativas, riscos e trade-offs para proteger a entrelinha do cafezal.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main>
      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#problema">O problema</a>
            <a href="#como">Como funciona</a>
            <a href="#nasa">Dados orbitais</a>
          </nav>
          <Link
            to="/chat"
            className="rounded-full bg-cherry px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Analisar minha terra
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-10 sm:px-8 sm:pb-28 lg:pt-16">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="eyebrow anim-enter">Da órbita para a sua terra</p>
            <h1 className="display-soft anim-enter mt-5 max-w-[11ch] text-[clamp(4.1rem,9vw,8.5rem)]">
              Solo forte. Café que vai mais longe<span className="text-cherry">.</span>
            </h1>
            <p className="mt-7 max-w-[41rem] text-xl leading-relaxed text-muted-foreground">
              Compare formas de proteger a entrelinha sem aumentar o risco para o café. O Cerejá
              mostra o que faz sentido estudar, as ressalvas e a evidência por trás da avaliação.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/chat"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-cherry px-7 text-base font-semibold text-primary-foreground shadow-[0_12px_35px_oklch(0.52_0.2_27/0.18)] transition hover:-translate-y-0.5"
              >
                Marcar meu território <ArrowRight className="size-4" />
              </Link>
              <span className="text-sm font-semibold text-muted-foreground">
                Para café Canéfora de Rondônia
              </span>
            </div>
          </div>
          <TerritoryHero />
        </div>
      </section>

      <section id="problema" className="bg-leaf px-5 py-20 text-leaf-foreground sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow text-sun">O problema é no chão</p>
            <h2 className="display-soft mt-4 text-[clamp(3.2rem,7vw,6.4rem)]">
              Cobrir o solo ajuda. Escolher sem contexto pode atrapalhar.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProblemCard number="01" title="Proteção necessária">
              Solo descoberto recebe diretamente chuva, sol e vento, mas apenas “plantar mais” não
              resolve a decisão.
            </ProblemCard>
            <ProblemCard number="02" title="Competição possível">
              Uma cobertura viva também usa água e exige manejo. Idade, espaçamento e irrigação
              mudam o que faz sentido.
            </ProblemCard>
          </div>
        </div>
      </section>

      <section id="como" className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1280px]">
          <p className="eyebrow">Uma solução em três movimentos</p>
          <h2 className="display-soft mt-4 max-w-[12ch] text-[clamp(3.3rem,7vw,6.5rem)]">
            Sua experiência orienta. O satélite amplia. O solo responde.
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            <Step icon={MapPinned} number="01" title="Delimite a área">
              Clique no mapa e forme o polígono do território que deseja estudar.
            </Step>
            <Step icon={Satellite} number="02" title="Leia os sinais">
              Chuva e umidade regional qualificam a seca, a erosão e a janela de estabelecimento.
            </Step>
            <Step icon={Sprout} number="03" title="Escolha um caminho">
              Compare vegetação manejada, cobertura permanente e rotação com riscos e trade-offs.
            </Step>
          </div>
        </div>
      </section>

      <section id="nasa" className="paper-grain bg-card px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="orbital-badge">
            <Satellite className="size-9" />
          </div>
          <div>
            <p className="eyebrow">POWER · IMERG · SMAP · NEX-GDDP</p>
            <h2 className="display-soft mt-4 text-5xl sm:text-7xl">
              NASA só entra quando muda a decisão.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              A chuva muda a janela. A umidade muda a ressalva de competição. O clima futuro muda a
              prioridade de adaptação. Os indicadores ambientais estão em modo de referência — sem
              fingir consulta ao vivo ou precisão dentro de cada linha do café.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
              {["Sinal com consequência", "Regra explicável", "Limite visível"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2"
                >
                  <Check className="size-4 text-leaf" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-cherry px-5 py-24 text-primary-foreground sm:px-8 sm:py-32">
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
            Comece pelo território
          </p>
          <h2 className="display-soft mt-6 max-w-[12ch] text-[clamp(3.5rem,8vw,7.5rem)]">
            Veja o que cada cobertura entrega — e o que ela exige.
          </h2>
          <Link
            to="/chat"
            className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-paper px-7 font-semibold text-foreground"
          >
            Analisar minha terra <ArrowRight className="size-4" />
          </Link>
        </div>
        <img
          src={cherry}
          alt=""
          className="fruit-dark anim-bob pointer-events-none absolute -bottom-24 right-[-5%] w-[40%] max-w-[520px] opacity-75"
        />
      </section>
      <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
        <Brand compact />
        <span className="text-sm text-muted-foreground">
          Cerejá · inteligência territorial para o solo do café.
        </span>
      </footer>
    </main>
  );
}

function TerritoryHero() {
  return (
    <div
      className="orbital-scene min-h-[430px]"
      aria-label="Ilustração de um território visto por satélite"
    >
      <div className="satellite-orbit">
        <Satellite className="size-8" />
      </div>
      <div className="orbital-scan" />
      <svg viewBox="0 0 640 500" className="size-full" aria-hidden="true">
        <path d="M-20 120 C150 30 210 180 390 96 S590 20 700 80" className="territory-road" />
        <path d="M80 540 C130 300 260 310 310 100 S470 0 610 -40" className="territory-stream" />
        <polygon
          points="135,125 390,90 510,305 330,420 120,320"
          className="territory-polygon territory-polygon-scan"
        />
      </svg>
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl bg-paper/90 p-4 text-foreground backdrop-blur">
        <span>
          <small className="block text-xs font-bold uppercase tracking-wider text-cherry">
            Território selecionado
          </small>
          <strong className="mt-1 block">Cafezal · Rondônia</strong>
        </span>
        <span className="rounded-full bg-leaf px-3 py-1.5 text-xs font-semibold text-leaf-foreground">
          Leitura orbital
        </span>
      </div>
    </div>
  );
}
function Step({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-paper p-7 sm:p-9">
      <div className="flex items-center justify-between">
        <Icon className="size-6 text-cherry" />
        <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground">{number}</span>
      </div>
      <h3 className="mt-12 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>
    </article>
  );
}
function ProblemCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-leaf-foreground/15 p-6">
      <span className="text-xs font-bold tracking-[0.18em] text-sun">{number}</span>
      <h3 className="mt-8 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed opacity-65">{children}</p>
    </article>
  );
}

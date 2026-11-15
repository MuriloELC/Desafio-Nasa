import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Droplets, Leaf, RefreshCcw, ShieldCheck, Sprout, SunMedium } from "lucide-react";
import { AppPage } from "@/components/cereja-shell";

export const Route = createFileRoute("/aprender")({
  head: () => ({
    meta: [
      { title: "Aprender · Cerejá" },
      {
        name: "description",
        content: "Um guia visual sobre solo, clima e coberturas nas entrelinhas do café.",
      },
    ],
  }),
  component: LearnPage,
});

const strategies = {
  espontanea: {
    number: "01",
    title: "Vegetação espontânea + palhada",
    tag: "Menor implantação",
    text: "Manejar a vegetação já presente e manter os resíduos sobre o solo pode reduzir a exposição. A composição e a competição precisam ser acompanhadas.",
    steps: [
      "Identificar as espécies presentes",
      "Roçar antes da competição excessiva",
      "Manter a palhada distribuída",
    ],
  },
  permanente: {
    number: "02",
    title: "Cobertura permanente",
    tag: "Proteção contínua",
    text: "Uma cobertura de baixo porte pode permanecer na entrelinha, desde que água, nutrientes e faixa livre junto ao café sejam monitorados.",
    steps: [
      "Escolher espécie compatível",
      "Implantar com umidade suficiente",
      "Controlar porte e competição",
    ],
  },
  rotacao: {
    number: "03",
    title: "Rotação de coberturas",
    tag: "Mais diversidade",
    text: "Alternar espécies anuais diversifica raízes e resíduos. O benefício depende da escolha, da janela de chuva e da capacidade de manejo.",
    steps: [
      "Definir o objetivo do ciclo",
      "Planejar a janela de implantação",
      "Roçar e preservar a palhada",
    ],
  },
} as const;

function LearnPage() {
  const [selected, setSelected] = useState<keyof typeof strategies>("rotacao");
  const active = strategies[selected];
  return (
    <AppPage>
      <header className="learn-hero app-hero rounded-[2.5rem] px-6 py-12 sm:px-10 sm:py-16">
        <p className="eyebrow text-white/70">Aprender com o território</p>
        <h1 className="display-soft mt-3 max-w-4xl text-5xl text-white sm:text-7xl">
          O que acontece no clima é sentido no solo.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/80">
          Um guia visual para entender como cobertura, água e manejo se conectam nas entrelinhas do
          café Canéfora.
        </p>
        <Link
          to="/minha-terra"
          className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-bold text-[#173a2b]"
        >
          Ver minha terra
        </Link>
      </header>

      <section className="app-section-intro py-12">
        <p className="eyebrow">Por que proteger</p>
        <h2 className="display-soft mt-2 text-4xl sm:text-5xl">
          Três relações que orientam a decisão
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <LearnCard
            icon={SunMedium}
            title="Calor e estiagem"
            text="Solo exposto aquece mais rapidamente e perde proteção. Cobertura não cria água, mas ajuda a reduzir a exposição direta."
          />
          <LearnCard
            icon={Droplets}
            title="Chuva irregular"
            text="A soma mensal não conta toda a história. Distribuição, intensidade e umidade no campo mudam a janela de implantação."
          />
          <LearnCard
            icon={ShieldCheck}
            title="Solo coberto"
            text="Palhada e vegetação podem amortecer o impacto da chuva e reduzir o contato direto do solo com sol e enxurrada."
          />
        </div>
      </section>

      <section id="estrategias" className="border-t border-border py-12">
        <p className="eyebrow">Estratégias de entrelinha</p>
        <h2 className="display-soft mt-2 text-4xl sm:text-5xl">
          Não existe uma única cobertura certa.
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Compare caminhos de manejo. A escolha final depende do espaçamento, da fase do café, da
          água disponível e da capacidade de intervir no momento certo.
        </p>
        <div className="mt-7 grid gap-3 lg:grid-cols-3">
          {Object.entries(strategies).map(([key, item]) => (
            <button
              key={key}
              type="button"
              aria-pressed={selected === key}
              onClick={() => setSelected(key as keyof typeof strategies)}
              className={`strategy-choice rounded-3xl border p-5 text-left transition ${selected === key ? "selected" : ""}`}
            >
              <span className="eyebrow">
                {item.number} · {item.tag}
              </span>
              <strong className="mt-3 block text-xl">{item.title}</strong>
            </button>
          ))}
        </div>
        <article className="mt-4 grid gap-7 rounded-[2rem] bg-[#173a2b] p-7 text-white md:grid-cols-[1.2fr_0.8fr] md:p-9">
          <div>
            <p className="eyebrow text-white/60">Estratégia selecionada</p>
            <h3 className="mt-2 text-3xl font-semibold">{active.title}</h3>
            <p className="mt-4 text-white/75">{active.text}</p>
          </div>
          <ol className="space-y-3">
            {active.steps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl bg-white/10 p-4">
                <span className="font-bold text-[#f2bd86]">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section id="impacto" className="border-t border-border py-12">
        <p className="eyebrow">Como ler o painel</p>
        <h2 className="display-soft mt-2 text-4xl sm:text-5xl">O número precisa de contexto.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <LearnCard
            icon={Droplets}
            title="Precipitação em 30 dias"
            text="Compara a janela recente com períodos históricos completos. Acima ou abaixo da média não significa, sozinho, excesso ou déficit para a planta."
          />
          <LearnCard
            icon={SunMedium}
            title="Temperatura média"
            text="Mostra a média do ar no período recente e sua distância do histórico local. Extremos diários podem não aparecer nesse número."
          />
          <LearnCard
            icon={Sprout}
            title="pH SoilGrids"
            text="É uma estimativa regional em 0–5 cm. Serve para contexto e comparação espacial, mas não substitui coleta e análise do talhão."
          />
        </div>
      </section>

      <section id="plano" className="border-t border-border py-12">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <RefreshCcw className="size-10 text-cherry" />
            <h2 className="display-soft mt-4 text-4xl">Aprender, observar, ajustar.</h2>
          </div>
          <div>
            <p className="text-lg">
              O CEREJÁ organiza evidências para apoiar a conversa com o produtor e a assistência
              técnica. Ele não substitui vistoria, análise de solo ou recomendação agronômica.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <Source
                href="https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1027715/1/Doc159cafe.pdf"
                label="Embrapa · Manejo agroecológico de plantas daninhas do café"
              />
              <Source
                href="https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1023829/1/17435.pdf"
                label="Embrapa · Café na Amazônia"
              />
              <Source
                href="https://docs.isric.org/globaldata/soilgrids/"
                label="ISRIC · Documentação SoilGrids"
              />
            </div>
          </div>
        </div>
      </section>
    </AppPage>
  );
}

function LearnCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Leaf;
  title: string;
  text: string;
}) {
  return (
    <article className="ui-card rounded-3xl border border-border bg-paper p-6">
      <Icon className="size-7 text-cherry" />
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-muted-foreground">{text}</p>
    </article>
  );
}
function Source({ href, label }: { href: string; label: string }) {
  return (
    <p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-cherry underline"
      >
        {label}
      </a>
    </p>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { Brand } from "@/components/cereja-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cerejá · o futuro começa no solo" },
      {
        name: "description",
        content: "Cerejá — inteligência para proteger o solo do cafezal.",
      },
      { property: "og:title", content: "Cerejá · o futuro começa no solo" },
      {
        property: "og:description",
        content: "Entenda os riscos, escolha como proteger o solo e saiba quando agir.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="landing-page bg-[#f3ecdc] text-[#342b25]">
      <header className="bg-[#f3ecdc]">
        <div className="mx-auto flex h-20 w-[min(1320px,calc(100%-48px))] items-center justify-between gap-6 max-[620px]:h-[68px] max-[620px]:w-[calc(100%-28px)]">
          <Brand />
          <nav
            className="flex gap-7 text-sm font-bold max-[980px]:hidden"
            aria-label="Navegação principal"
          >
            <a
              className="border-b-2 border-transparent py-2 transition hover:border-[#b84032]"
              href="#solo"
            >
              Cuidar do solo
            </a>
            <a
              className="border-b-2 border-transparent py-2 transition hover:border-[#b84032]"
              href="#entrelinhas"
            >
              Entrelinhas
            </a>
            <a
              className="border-b-2 border-transparent py-2 transition hover:border-[#b84032]"
              href="#como-funciona"
            >
              Como funciona
            </a>
          </nav>
          <Link
            to="/chat"
            className="inline-flex items-center justify-center rounded-full border-2 border-[#b84032] bg-[#b84032] px-6 py-3 font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#342b25] max-[620px]:hidden"
          >
            Começar minha análise
          </Link>
        </div>
      </header>

      <section id="inicio" className="pb-[70px] pt-[34px] max-[620px]:pt-5">
        <div className="mx-auto w-[min(1320px,calc(100%-48px))] max-[620px]:w-[calc(100%-28px)]">
          <div className="flex justify-between gap-5 border-y-2 border-[#3b3029] py-2.5 text-[13px] font-extrabold uppercase tracking-[0.035em] max-[620px]:text-xs">
            <span>NASA Space Apps 2026</span>
            <span className="max-[620px]:hidden">Solo · clima · entrelinhas</span>
            <span>Nº 001</span>
          </div>
          <div className="grid grid-cols-[7fr_5fr] items-center gap-12 max-[980px]:grid-cols-1 max-[980px]:gap-4">
            <div className="pt-6">
              <h1 className="landing-display mt-6 max-w-[950px] text-[clamp(4.3rem,10.4vw,9.25rem)]">
                Seu solo
                <br />
                <span className="text-[#b84032]">mais forte</span>
                <span className="text-[#e8bd55]">.</span>
              </h1>
              <p className="max-w-[720px] text-[clamp(1.2rem,2vw,1.8rem)] leading-[1.17]">
                <strong>Seu cafezal mais preparado para o clima que vem.</strong> O Cerejá ajuda a
                entender os riscos, escolher como proteger o solo e saber quando agir.
              </p>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-[#75695d]">
                Para café Canéfora de Rondônia
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#b84032] bg-[#b84032] px-6 py-3.5 font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#342b25]"
                >
                  Começar minha análise <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3b3029] bg-[#fbf7ed] px-6 py-3.5 font-extrabold transition hover:-translate-y-0.5"
                >
                  Como funciona <ArrowDown className="size-4" />
                </a>
              </div>
            </div>
            <HeroArt />
          </div>
        </div>
      </section>

      <Ticker />

      <section id="solo" className="py-[110px] max-[620px]:py-[70px]">
        <div className="mx-auto w-[min(1320px,calc(100%-48px))] max-[620px]:w-[calc(100%-28px)]">
          <p className="font-extrabold uppercase tracking-[0.08em] text-[#b84032]">
            01 / Cuidar do solo
          </p>
          <h2 className="landing-display mt-4 max-w-[1100px] text-[clamp(3.25rem,7.8vw,6.75rem)]">
            O clima muda.
            <br />O solo sente.
          </h2>
          <p className="max-w-[820px] text-[21px] leading-[1.5] text-[#75695d]">
            O solo sustenta o cafezal, armazena água e dá suporte às raízes. Cobrir o solo ajuda,
            mas quando ele fica desprotegido, o calor, a estiagem e as chuvas fortes podem
            transformar pequenos sinais em grandes perdas.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-[18px] max-[980px]:grid-cols-1">
            <ProblemCard
              number="01 / PROBLEMA"
              title="Solo exposto"
              tag="Mais calor · menos proteção"
              visual={<SoilVisual kind="heat" />}
            >
              Sem cobertura, a superfície recebe calor direto e perde proteção contra o impacto da
              chuva.
            </ProblemCard>
            <ProblemCard
              number="02 / PROBLEMA"
              title="Falta de água"
              tag="Estiagem · estresse hídrico"
              visual={<SoilVisual kind="water" />}
            >
              O solo descoberto aquece mais e pode perder umidade justamente quando o café mais
              precisa.
            </ProblemCard>
            <ProblemCard
              number="03 / PROBLEMA"
              title="Erosão"
              tag="Enxurrada · perda de solo"
              visual={<SoilVisual kind="erosion" />}
            >
              A chuva forte carrega a camada superficial, abre caminhos de enxurrada e empobrece o
              terreno.
            </ProblemCard>
          </div>
        </div>
      </section>

      <section
        id="entrelinhas"
        className="bg-[#284a35] py-[110px] text-[#f5efdc] max-[620px]:py-[70px]"
      >
        <div className="mx-auto grid w-[min(1320px,calc(100%-48px))] grid-cols-2 items-center gap-[58px] max-[980px]:grid-cols-1 max-[620px]:w-[calc(100%-28px)]">
          <div>
            <p className="font-extrabold uppercase tracking-[0.08em] text-[#e8bd55]">
              02 / Proteger e melhorar
            </p>
            <h2 className="landing-display mt-3 text-[clamp(3.6rem,8vw,7.25rem)] text-[#e8bd55]">
              A solução pode estar nas entrelinhas.
            </h2>
            <p className="max-w-[820px] text-[21px] leading-[1.5] text-[#e8eadc]">
              Manter plantas de cobertura ou palhada entre as linhas do café ajuda a proteger a
              superfície, conservar água, reduzir a força da chuva e fortalecer o solo ao longo do
              tempo.
            </p>
            <span className="mt-7 inline-block -rotate-1.5 border-2 border-[#342b25] bg-[#e8bd55] px-4 py-2.5 text-lg font-extrabold text-[#342b25]">
              Solo coberto é solo mais preparado.
            </span>
          </div>
          <BetweenArt />
        </div>
      </section>

      <section id="como-funciona" className="bg-[#fbf7ed] py-[110px] max-[620px]:py-[70px]">
        <div className="mx-auto w-[min(1320px,calc(100%-48px))] max-[620px]:w-[calc(100%-28px)]">
          <div className="grid grid-cols-[7fr_5fr] items-end gap-10 max-[980px]:grid-cols-1">
            <div>
              <p className="font-extrabold uppercase tracking-[0.08em] text-[#b84032]">
                03 / Como o Cerejá funciona
              </p>
              <h2 className="landing-display mt-4 text-[clamp(3.25rem,7.8vw,6.75rem)]">
                Da conversa ao plano de ação.
              </h2>
            </div>
            <p className="max-w-[820px] pb-2 text-[21px] leading-[1.5] text-[#75695d]">
              Em poucos passos, o produtor conta sobre a lavoura, localiza a propriedade e recebe
              opções de manejo organizadas em um calendário simples.
            </p>
          </div>
          <div className="mt-[68px] grid gap-[26px]">
            <StepCard
              number="Etapa 01 / Conversa"
              title="Conte sobre sua lavoura."
              visual={<ChatMock />}
            >
              O Cerejá faz perguntas rápidas sobre o cafezal, o solo e o principal desafio da
              propriedade. Sem termos complicados, como uma conversa com quem entende a rotina do
              campo.
            </StepCard>
            <StepCard
              number="Etapa 02 / Localização"
              title="Marque sua propriedade."
              reverse
              visual={<MapMock />}
            >
              No mapa, o produtor encontra a região de Cacoal, seleciona a área da lavoura e
              confirma o ponto. Assim, o Cerejá relaciona a análise ao clima daquela localização.
            </StepCard>
            <StepCard
              number="Etapa 03 / Escolha"
              title="Compare 3 estratégias."
              visual={<StrategyMock />}
            >
              O Cerejá apresenta três caminhos de manejo. O produtor escolhe um deles e vê, de forma
              direta, os benefícios esperados para proteção do solo, água, palhada e matéria
              orgânica.
            </StepCard>
            <StepCard
              number="Etapa 04 / Calendário"
              title="Saiba o que fazer a cada mês."
              reverse
              visual={<CalendarMock />}
            >
              A estratégia escolhida vira um calendário claro. Cada mês apresenta uma ação curta —
              implantar, roçar, formar palhada, monitorar a água ou reforçar a proteção.
            </StepCard>
          </div>
        </div>
      </section>

      <section className="bg-[#e9dfcd] py-[90px]">
        <div className="mx-auto grid w-[min(1320px,calc(100%-48px))] grid-cols-[.9fr_1.1fr] items-center gap-10 max-[980px]:grid-cols-1 max-[620px]:w-[calc(100%-28px)]">
          <div className="grid min-h-[22rem] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#a7bd75,#284a35_60%)] text-[#fbf7ed] shadow-[inset_-30px_-25px_60px_rgba(15,45,30,.3),0_30px_60px_rgba(40,74,53,.2)]">
            <span className="text-center text-sm font-extrabold uppercase tracking-[0.12em]">
              NASA POWER
              <br />
              GPM IMERG
            </span>
          </div>
          <div>
            <p className="font-extrabold uppercase tracking-[0.08em] text-[#b84032]">
              Dados orbitais · contexto regional
            </p>
            <h2 className="landing-display mt-4 text-[clamp(3rem,6vw,5.5rem)]">
              NASA só entra quando muda a decisão.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-[1.5] text-[#75695d]">
              Chuva e temperatura entram como contexto regional. Cada série mostra a fonte, a
              resolução e os períodos completos. As respostas do produtor e as regras agronômicas
              orientam a comparação; dados faltantes ficam explícitos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-extrabold">
              {["Sinal com consequência", "Regra explicável", "Limite visível"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full bg-[#fbf7ed] px-4 py-2"
                >
                  <CheckIcon />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#b84032] py-[90px] text-white">
        <div className="mx-auto w-[min(1320px,calc(100%-48px))] max-[620px]:w-[calc(100%-28px)]">
          <p className="font-extrabold uppercase tracking-[0.08em] text-[#e8bd55]">
            Sua terra · suas escolhas
          </p>
          <h2 className="landing-display mt-4 max-w-[1050px] text-[clamp(3.25rem,8vw,6.6rem)]">
            Conhecer o solo é o primeiro passo para protegê-lo.
          </h2>
          <Link
            to="/chat"
            className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-[#3b3029] bg-[#fbf7ed] px-6 py-3.5 font-extrabold text-[#342b25] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#342b25]"
          >
            Começar minha análise <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex w-[min(1320px,calc(100%-48px))] justify-between gap-4 border-t-2 border-[#3b3029] py-7 text-xs font-extrabold uppercase tracking-[0.035em] max-[620px]:w-[calc(100%-28px)] max-[620px]:flex-col">
        <Brand compact />
        <span>Cerejá · NASA Space Apps 2026</span>
      </footer>
    </main>
  );
}

function CheckIcon() {
  return (
    <span className="grid size-4 place-items-center rounded-full bg-[#284a35] text-[10px] text-white">
      ✓
    </span>
  );
}

function HeroArt() {
  return (
    <div className="relative grid min-h-[580px] place-items-center max-[980px]:min-h-[440px] max-[620px]:min-h-[360px]">
      <span className="absolute left-0 top-[52px] z-10 max-w-[150px] border-l-4 border-[#284a35] py-2 pl-3 text-xs font-extrabold uppercase leading-[1.4]">
        O futuro começa no solo
      </span>
      <div className="absolute h-[520px] w-[520px] rounded-full border-2 border-[#3b3029]/15 before:absolute before:inset-11 before:rounded-full before:border-2 before:border-[#3b3029]/10 after:absolute after:inset-24 after:rounded-full after:border-2 after:border-[#3b3029]/10 max-[620px]:h-[330px] max-[620px]:w-[330px]" />
      <svg
        viewBox="0 0 620 620"
        className="relative z-[2] w-full max-w-[520px] drop-shadow-[0_30px_22px_rgba(44,31,23,.27)]"
        role="img"
        aria-label="Ilustração de uma cereja de café madura com folhas"
      >
        <path
          d="M315 172C301 113 354 70 424 79"
          fill="none"
          stroke="#284a35"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M408 82c54-33 105-8 113 29-52 31-102 25-113-29Z"
          fill="#365d43"
          stroke="#342b25"
          strokeWidth="3"
        />
        <circle cx="300" cy="350" r="185" fill="#b84032" stroke="#342b25" strokeWidth="5" />
        <path
          d="M215 261c56-39 129-35 179 11"
          fill="none"
          stroke="#e9957d"
          strokeWidth="24"
          strokeLinecap="round"
          opacity=".8"
        />
        <circle cx="248" cy="316" r="29" fill="#d76a51" opacity=".55" />
        <path
          d="M191 422c54 53 157 75 232 5"
          fill="none"
          stroke="#8e2e25"
          strokeWidth="13"
          strokeLinecap="round"
          opacity=".65"
        />
      </svg>
      <span className="absolute bottom-[58px] right-[-5px] z-[3] -rotate-6 border-2 border-[#b84032] bg-[#fbf7ed] px-3.5 py-2 text-sm font-extrabold uppercase text-[#b84032] max-[620px]:bottom-4 max-[620px]:text-[11px]">
        Do solo ao grão
      </span>
    </div>
  );
}

function Ticker() {
  const items = ["Proteção", "Água", "Palhada", "Matéria orgânica", "Decisão", "Território"];
  return (
    <div className="overflow-hidden bg-[#284a35] py-3.5 text-[#f5efdc]" aria-hidden="true">
      <div className="landing-ticker flex w-max gap-11">
        {[...items, ...items].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-7 whitespace-nowrap font-extrabold uppercase"
          >
            <i className="size-[11px] rotate-[35deg] rounded-[80%_20%_80%_20%] bg-[#a7bd75]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProblemCard({
  number,
  title,
  tag,
  visual,
  children,
}: {
  number: string;
  title: string;
  tag: string;
  visual: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-[20px] border-2 border-[#3b3029]/25 bg-[#fbf7ed] max-[980px]:mx-auto max-[980px]:w-full max-[980px]:max-w-[620px]">
      {visual}
      <div className="min-h-[190px] p-6 pb-7">
        <span className="font-extrabold text-[#b84032]">{number}</span>
        <h3 className="mt-2 text-[29px] font-extrabold">{title}</h3>
        <p className="mt-3 text-[17px] leading-[1.5] text-[#75695d]">{children}</p>
        <span className="mt-[18px] inline-flex rounded-full bg-[#e9dfcd] px-3 py-2 text-xs font-extrabold uppercase">
          {tag}
        </span>
      </div>
    </article>
  );
}

function SoilVisual({ kind }: { kind: "heat" | "water" | "erosion" }) {
  return (
    <div className="h-[260px] border-b-2 border-[#3b3029]/20 bg-[#dbc5a3] max-[620px]:h-[250px]">
      <svg viewBox="0 0 600 300" className="size-full" aria-hidden="true">
        <rect
          width="600"
          height="300"
          fill={kind === "heat" ? "#d8b487" : kind === "water" ? "#c8d1c4" : "#d2bea3"}
        />
        {kind === "heat" ? (
          <>
            <circle cx="470" cy="75" r="46" fill="#e8bd55" stroke="#342b25" strokeWidth="4" />
            <path
              d="M0 210c90-54 155 28 248-9 75-30 140-7 214-19 48-8 86 9 138-15v133H0Z"
              fill="#9a623c"
            />
            <path
              d="M0 246c75-25 146 22 228-8 107-40 189 19 372-20"
              fill="none"
              stroke="#6e442c"
              strokeWidth="13"
              opacity=".7"
            />
            <path
              d="M160 75v73M126 111h68M137 88l46 48M183 88l-46 48"
              stroke="#b84032"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </>
        ) : kind === "water" ? (
          <>
            <path d="M0 204c80-61 136 27 231-19 97-46 175 21 369-25v140H0Z" fill="#8d6e53" />
            <path
              d="M0 232c92-34 139 23 236-9 132-44 180 8 364-31"
              fill="none"
              stroke="#684a38"
              strokeWidth="11"
            />
            <path
              d="M94 44c0 0-30 41-30 61a30 30 0 0 0 60 0c0-20-30-61-30-61Z"
              fill="#5a9eb1"
              stroke="#342b25"
              strokeWidth="4"
            />
            <path
              d="M330 108c27-34 43-34 67 0M360 87V56M389 103l24-23"
              fill="none"
              stroke="#284a35"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path d="M0 180c105-31 160 19 250-26 102-51 179 14 350-15v161H0Z" fill="#956344" />
            <path
              d="M0 222c100-45 166 7 252-32 82-36 172 5 348-34"
              fill="none"
              stroke="#68402f"
              strokeWidth="16"
            />
            <path
              d="M280 0c30 65-15 93 13 152 24 50 84 66 80 148"
              fill="none"
              stroke="#5f8b72"
              strokeWidth="17"
            />
            <path
              d="M372 50c-18 38 8 65 34 83"
              fill="none"
              stroke="#284a35"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function BetweenArt() {
  return (
    <div className="relative min-h-[580px] overflow-hidden rounded-3xl border-2 border-white/20 bg-[#d7dfbe] shadow-[10px_10px_0_rgba(0,0,0,.25)] max-[980px]:min-h-[500px] max-[620px]:min-h-[420px]">
      <svg viewBox="0 0 700 620" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="700" height="620" fill="#d7dfbe" />
        <path
          d="M-20 160c100-60 179 18 276-25 116-51 205 12 465-35"
          fill="none"
          stroke="#a5b98d"
          strokeWidth="48"
        />
        <path
          d="M-20 350c112-78 205 25 302-42 126-86 231 38 438-33"
          fill="none"
          stroke="#6b9259"
          strokeWidth="61"
        />
        <path
          d="M-20 526c130-75 199 33 322-45 100-63 210 18 418-34"
          fill="none"
          stroke="#8dad68"
          strokeWidth="46"
        />
        <path
          d="M0 250c120 54 225-51 345 4 113 52 214 13 355-38"
          fill="none"
          stroke="#f0e8be"
          strokeWidth="22"
          opacity=".8"
        />
        <path
          d="M22 72c102 34 163 85 251 75 101-11 158-62 277-60 61 1 96 20 150 40"
          fill="none"
          stroke="#486f49"
          strokeWidth="11"
        />
        <g fill="#284a35">
          <path d="M90 131c-21-27-17-47 1-65 25 13 30 35-1 65Z" />
          <path d="M156 203c-18-33-8-51 15-62 22 21 17 41-15 62Z" />
          <path d="M492 238c-21-28-15-48 5-63 23 16 25 37-5 63Z" />
          <path d="M580 452c-24-27-20-48 1-63 25 17 28 37-1 63Z" />
        </g>
        <g fill="#a7bd75">
          <circle cx="115" cy="375" r="15" />
          <circle cx="410" cy="474" r="19" />
          <circle cx="610" cy="130" r="12" />
        </g>
      </svg>
      <div className="absolute bottom-[22px] left-6 right-6 flex items-center justify-between gap-[18px] rounded-[15px] border border-white/25 bg-[#284a35]/95 px-5 py-[18px] text-white max-[620px]:block">
        <strong className="text-[22px]">Proteção que trabalha com a lavoura.</strong>
        <span className="max-w-[290px] text-sm leading-[1.4] text-[#dce7d9] max-[620px]:mt-2 max-[620px]:block">
          As entrelinhas deixam de ser espaço vazio e passam a fazer parte da estratégia de
          adaptação.
        </span>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  children,
  visual,
  reverse = false,
}: {
  number: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <article
      className={`grid min-h-[410px] overflow-hidden rounded-3xl border-2 border-[#3b3029]/25 bg-[#fbf7ed] max-[980px]:grid-cols-1 ${reverse ? "lg:grid-cols-[7fr_minmax(290px,5fr)]" : "lg:grid-cols-[minmax(290px,5fr)_7fr]"}`}
    >
      <div
        className={`flex flex-col justify-center p-[42px] max-[620px]:p-6 ${reverse ? "lg:order-2" : ""}`}
      >
        <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#b84032]">
          {number}
        </span>
        <h3 className="mt-4 max-w-[560px] text-[clamp(2.2rem,4vw,3.9rem)] font-extrabold uppercase leading-[.95] tracking-[-.04em]">
          {title}
        </h3>
        <p className="mt-[18px] max-w-[560px] text-lg leading-[1.55] text-[#75695d]">{children}</p>
      </div>
      <div
        className={`grid min-w-0 place-items-center bg-[#e9dfcd] p-8 max-[620px]:p-4 ${reverse ? "lg:order-1" : ""}`}
      >
        {visual}
      </div>
    </article>
  );
}

function MockFrame({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[330px] w-full overflow-hidden rounded-[18px] border-2 border-[#3b3029] bg-[#fffdf6]">
      <div className="flex h-12 items-center justify-between bg-[#284a35] px-4 text-sm font-extrabold text-white">
        <span>{title}</span>
        <span>{detail}</span>
      </div>
      {children}
    </div>
  );
}

function ChatMock() {
  return (
    <MockFrame title="Cerejá · Assistente" detail="● ● ●">
      <div className="grid gap-[13px] p-6 text-[15px] leading-[1.4]">
        <div className="max-w-[78%] rounded-[17px] rounded-bl-[3px] bg-[#e9dfcd] p-3.5">
          Olá! O que existe hoje nas entrelinhas do seu cafezal?
        </div>
        <div className="ml-auto max-w-[78%] rounded-[17px] rounded-br-[3px] bg-[#284a35] p-3.5 text-white">
          Boa parte do solo está exposta.
        </div>
        <div className="max-w-[78%] rounded-[17px] rounded-bl-[3px] bg-[#e9dfcd] p-3.5">
          Entendi. Qual é a sua maior preocupação?
        </div>
        <div className="ml-auto max-w-[78%] rounded-[17px] rounded-br-[3px] bg-[#284a35] p-3.5 text-white">
          Conservar água durante a seca.
        </div>
      </div>
      <div className="absolute bottom-[18px] left-5 right-5 rounded-full border-2 border-[#3b3029]/25 bg-white px-4 py-3 text-[13px] text-[#75695d]">
        Digite sua resposta...
      </div>
    </MockFrame>
  );
}

function MapMock() {
  return (
    <MockFrame title="Localizar propriedade" detail="Mapa da região">
      <div className="relative h-[calc(100%-48px)] min-h-[282px] bg-[#dce4cf]">
        <svg viewBox="0 0 720 390" className="size-full" aria-hidden="true">
          <path d="M0 90 155 40l130 55 130-56 165 76 140-54v329H0Z" fill="#c5d2bc" />
          <path
            d="M-30 262c165-90 230 54 367-24 119-68 207 41 425-53"
            fill="none"
            stroke="#a0b493"
            strokeWidth="46"
          />
          <path
            d="M49 350c79-164 202-125 286-217 56-62 142-69 264-58"
            fill="none"
            stroke="#f2e6b2"
            strokeWidth="18"
          />
          <polygon
            points="250,102 470,130 521,273 321,315 178,218"
            fill="#e8bd55"
            fillOpacity=".46"
            stroke="#284a35"
            strokeWidth="5"
          />
          <circle cx="347" cy="212" r="15" fill="#b84032" stroke="#fffdf6" strokeWidth="7" />
          <text x="347" y="355" textAnchor="middle" fontSize="20" fontWeight="900" fill="#342b25">
            PROPRIEDADE SELECIONADA
          </text>
        </svg>
        <span className="absolute left-[18px] top-[18px] rounded-xl border-2 border-[#3b3029] bg-[#fbf7ed] px-3 py-2 text-[13px] font-extrabold shadow-[4px_4px_0_rgba(52,43,37,.35)]">
          Cacoal · Rondônia
        </span>
        <span className="absolute bottom-[18px] right-[18px] rounded-full bg-[#b84032] px-4 py-3 text-[13px] font-extrabold text-white">
          Confirmar localização →
        </span>
      </div>
    </MockFrame>
  );
}

function StrategyMock() {
  const strategies = [
    ["Opção 01", "Manejo convencional", "Proteção moderada"],
    ["Selecionada", "Cobertura permanente", "+ Conserva água"],
    ["Opção 03", "Rotação planejada", "Mais diversidade"],
  ];
  return (
    <MockFrame title="Estratégias para as entrelinhas" detail="3 opções">
      <div className="grid h-[calc(100%-48px)] grid-cols-3 gap-2 p-[18px] max-[620px]:grid-cols-1 max-[620px]:overflow-auto">
        {strategies.map(([badge, title, benefit], index) => (
          <div
            key={title}
            className={`relative rounded-[13px] border-2 p-3.5 ${index === 1 ? "border-3 border-[#284a35] bg-[#edf0df] shadow-[4px_4px_0_rgba(40,74,53,.32)]" : "border-[#3b3029]/20 bg-[#fbf7ed]"}`}
          >
            {index === 1 ? (
              <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#284a35] text-xs text-white">
                ✓
              </span>
            ) : null}
            <span className="inline-block rounded-full bg-[#e9dfcd] px-2 py-1 text-[9px] font-extrabold uppercase">
              {badge}
            </span>
            <h4 className="mt-3 text-[15px] font-extrabold">{title}</h4>
            <p className="mt-2 text-[11px] leading-[1.4] text-[#75695d]">
              Proteção do solo com manejo adequado.
            </p>
            <span className="mt-3 block rounded-lg bg-white px-2 py-2 text-[10px] font-extrabold">
              {benefit}
            </span>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function CalendarMock() {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return (
    <MockFrame title="Plano anual de manejo" detail="12 meses">
      <div className="grid h-[calc(100%-48px)] grid-cols-4 gap-2 bg-[#fbf7ed] p-[18px] max-[620px]:grid-cols-3">
        {months.map((month, index) => (
          <div
            key={month}
            className={`min-h-[73px] rounded-[10px] border p-2 ${index === 2 || index === 9 ? "border-2 border-[#284a35] bg-[#d3dfc2]" : index === 5 || index === 6 || index === 7 ? "bg-[#efd89c]" : index < 2 || index > 10 ? "bg-[#d5dfcf]" : "bg-[#f7f0e4]"}`}
          >
            <strong className="block text-[11px] uppercase">{month}</strong>
            <span className="mt-1 block text-[9px] leading-[1.35] text-[#75695d]">
              {index === 2
                ? "Roçagem leve"
                : index === 5
                  ? "Conservar"
                  : index === 9
                    ? "Revisar cobertura"
                    : "Cobertura ativa"}
            </span>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

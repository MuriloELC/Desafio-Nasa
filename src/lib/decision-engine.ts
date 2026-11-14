import { EMBRAPA_EVIDENCE, type Evidence, type FarmContext } from "@/demo/decision-demo";

export type StrategyId = "managed" | "permanent" | "seasonal";
export type Suitability = "study" | "conditional" | "low" | "insufficient";

export type StrategyResult = {
  id: StrategyId;
  title: string;
  example: string;
  suitability: Suitability;
  suitabilityLabel: string;
  summary: string;
  why: string[];
  benefits: string[];
  risks: string[];
  tradeoff: { gain: string; cost: string };
  management: string;
  evidence: Evidence[];
  phases: Array<{ label: string; action: string; note: string }>;
  visualDensity: number;
  rootDepth: "shallow" | "mixed" | "deep";
};

type WorkingStrategy = Omit<StrategyResult, "suitability" | "suitabilityLabel"> & { score: number };

const labelSuitability = (
  score: number,
): Pick<StrategyResult, "suitability" | "suitabilityLabel"> => {
  if (score >= 4) return { suitability: "study", suitabilityLabel: "Faz sentido estudar agora" };
  if (score >= 1) return { suitability: "conditional", suitabilityLabel: "Adequada com ressalvas" };
  return { suitability: "low", suitabilityLabel: "Pouco adequada neste momento" };
};

const baseStrategies = (): Record<StrategyId, WorkingStrategy> => ({
  managed: {
    id: "managed",
    title: "Cobertura existente manejada",
    example: "Vegetação espontânea roçada + palhada",
    score: 1,
    summary: "Aproveita o que já nasce na área e evita que a roçada deixe o solo nu.",
    why: [],
    benefits: ["menor custo de implantação", "mantém resíduos sobre a superfície"],
    risks: ["cobertura irregular", "espécies presentes podem competir ou hospedar problemas"],
    tradeoff: {
      gain: "simplicidade e baixo custo",
      cost: "menor controle sobre composição e persistência",
    },
    management:
      "Roçar antes de florescimento excessivo e distribuir os resíduos sem descobrir o solo.",
    evidence: [EMBRAPA_EVIDENCE],
    phases: [
      {
        label: "Agora",
        action: "Mapear falhas",
        note: "Ver onde a superfície fica descoberta após a roçada.",
      },
      {
        label: "Estabelecimento",
        action: "Preservar palhada",
        note: "Aproveitar biomassa já disponível.",
      },
      {
        label: "Período seco",
        action: "Reduzir competição",
        note: "Controlar altura sem retirar toda a proteção.",
      },
      {
        label: "Próxima chuva",
        action: "Reavaliar composição",
        note: "Observar espécies dominantes e falhas.",
      },
    ],
    visualDensity: 45,
    rootDepth: "mixed",
  },
  permanent: {
    id: "permanent",
    title: "Cobertura permanente",
    example: "Urochloa/braquiária bem manejada",
    score: 1,
    summary: "Busca proteção contínua e produção de palhada ao longo do ano.",
    why: [],
    benefits: ["proteção mais contínua", "produção recorrente de biomassa e palhada"],
    risks: ["competição por água", "exige controle de altura e afastamento da linha do café"],
    tradeoff: { gain: "persistência da proteção", cost: "mais atenção à competição e à roçada" },
    management: "Planejar implantação na fase úmida e manejar altura antes da transição seca.",
    evidence: [EMBRAPA_EVIDENCE],
    phases: [
      {
        label: "Agora",
        action: "Confirmar água e espaço",
        note: "Checar irrigação, falhas e faixa livre junto ao café.",
      },
      {
        label: "Estabelecimento",
        action: "Implantar na chuva",
        note: "Evitar começar sem umidade suficiente.",
      },
      {
        label: "Período seco",
        action: "Manejar altura",
        note: "Conservar palhada e reduzir competição viva.",
      },
      {
        label: "Próxima chuva",
        action: "Recompor falhas",
        note: "Avaliar persistência e necessidade de ajuste.",
      },
    ],
    visualDensity: 85,
    rootDepth: "deep",
  },
  seasonal: {
    id: "seasonal",
    title: "Cobertura sazonal",
    example: "Milheto + crotalária, após validação local",
    score: 1,
    summary: "Alterna espécies e funções, concentrando a cobertura na janela mais favorável.",
    why: [],
    benefits: ["diversidade de raízes e biomassa", "permite ajustar a espécie ao objetivo"],
    risks: ["mais planejamento e custo", "compatibilidade fitossanitária precisa de laudo"],
    tradeoff: {
      gain: "diversidade funcional",
      cost: "maior complexidade e dependência da janela de chuva",
    },
    management:
      "Definir espécie e janela com assistência técnica e histórico de nematoides da área.",
    evidence: [EMBRAPA_EVIDENCE],
    phases: [
      {
        label: "Agora",
        action: "Definir função",
        note: "Biomassa, erosão ou estrutura pedem escolhas diferentes.",
      },
      {
        label: "Estabelecimento",
        action: "Usar a janela úmida",
        note: "Sincronizar semeadura e chuva.",
      },
      {
        label: "Período seco",
        action: "Converter em palhada",
        note: "Evitar competição prolongada.",
      },
      {
        label: "Próxima chuva",
        action: "Alternar com critério",
        note: "Revisar resultado antes do novo ciclo.",
      },
    ],
    visualDensity: 65,
    rootDepth: "mixed",
  },
});

const addReason = (
  strategy: WorkingStrategy,
  reason: string,
  delta: number,
  evidence?: Evidence,
) => {
  strategy.score += delta;
  strategy.why.push(reason);
  if (evidence && !strategy.evidence.some((item) => item.id === evidence.id))
    strategy.evidence.push(evidence);
};

export function evaluateStrategies(context: FarmContext): StrategyResult[] {
  const strategies = baseStrategies();
  const nasaWater = context.evidence.find((item) => item.id === "moisture");
  const nasaRain = context.evidence.find((item) => item.id === "seasonality");
  const producerIrrigation = context.evidence.find((item) => item.kind === "producer");

  if (context.soilExposure === "high") {
    addReason(
      strategies.permanent,
      "Há muita superfície exposta; proteção contínua ganha prioridade.",
      3,
      producerIrrigation,
    );
    addReason(
      strategies.seasonal,
      "A área exposta também pode receber cobertura na janela úmida.",
      2,
      nasaRain,
    );
    addReason(strategies.managed, "A vegetação atual não fecha todas as falhas da entrelinha.", -1);
  }

  if (context.waterRisk === "high" && context.irrigation === "none") {
    addReason(
      strategies.managed,
      "Sem irrigação e com seca marcada, aproveitar cobertura existente reduz risco de implantação.",
      3,
      nasaWater,
    );
    addReason(
      strategies.permanent,
      "A seca regional exige roçada e controle rigorosos para limitar competição por água.",
      -2,
      nasaWater,
    );
    addReason(
      strategies.seasonal,
      "A cobertura deve terminar o ciclo antes do pico da seca.",
      1,
      nasaRain,
    );
  }

  if (context.irrigation !== "none") {
    addReason(
      strategies.permanent,
      "A irrigação declarada melhora a segurança de estabelecimento, sem eliminar a necessidade de manejo.",
      3,
      producerIrrigation,
    );
    addReason(
      strategies.seasonal,
      "A água manejada amplia as opções, desde que o consumo seja acompanhado.",
      1,
    );
  }

  if (context.goal === "biomass")
    addReason(
      strategies.seasonal,
      "O objetivo de formar biomassa favorece uma sequência planejada de espécies.",
      3,
    );
  if (context.goal === "simplicity")
    addReason(
      strategies.managed,
      "O objetivo prioriza uma solução simples e de menor implantação.",
      3,
    );
  if (context.goal === "water")
    addReason(
      strategies.managed,
      "Conservar água favorece manter palhada sem prolongar competição viva na seca.",
      2,
      nasaWater,
    );
  if (context.goal === "erosion")
    addReason(
      strategies.permanent,
      "Cobertura contínua responde melhor ao objetivo de reduzir exposição à chuva.",
      2,
      nasaRain,
    );

  if (context.managementCapacity === "low") {
    addReason(
      strategies.managed,
      "A menor disponibilidade de manejo favorece uma solução menos complexa.",
      2,
    );
    addReason(
      strategies.seasonal,
      "Rotação exige planejamento e operações que hoje podem não caber na rotina.",
      -3,
    );
    addReason(
      strategies.permanent,
      "Cobertura permanente sem roçada no momento certo pode competir com o café.",
      -2,
    );
  } else if (context.managementCapacity === "high") {
    addReason(
      strategies.permanent,
      "A rotina de manejo informada permite controlar altura e palhada.",
      1,
    );
    addReason(
      strategies.seasonal,
      "Há capacidade para planejar implantação, encerramento e nova espécie.",
      2,
    );
  }

  return Object.values(strategies)
    .map(({ score, ...strategy }) => ({ ...strategy, ...labelSuitability(score) }))
    .sort((a, b) => {
      const rank: Record<Suitability, number> = {
        study: 3,
        conditional: 2,
        low: 1,
        insufficient: 0,
      };
      return rank[b.suitability] - rank[a.suitability];
    });
}

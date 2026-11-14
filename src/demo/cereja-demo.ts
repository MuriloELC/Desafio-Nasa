export type DataSource = {
  status: "local" | "verified";
  label: string;
  provider?: string;
  observedAt?: string;
  url?: string;
  limitations?: string;
};

export type FarmProfile = {
  schemaVersion: 1;
  name: string;
  city: string;
  coffeeType: string;
  varieties: string[];
  coffeePlants: number | null;
  ageBand: string;
  interrowSpacingM?: number | null;
  interrowCrops: string[];
  areaHa: number | null;
  irrigation?: "none" | "drip" | "other";
  currentManagement?: "exposed" | "spontaneous" | "cover";
  soilExposure?: "low" | "medium" | "high";
  goal?: "water" | "erosion" | "biomass" | "simplicity";
  managementCapacity?: "low" | "medium" | "high";
  location?: {
    description: string;
    lat?: number;
    lng?: number;
    precision: "approximate" | "user-selected";
    polygon?: Array<{ x: number; y: number }>;
  };
};

export type StrategyId = "conventional" | "cover" | "intercrop";

export type Metric = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  period?: string;
  tooltip: string;
  source: DataSource;
};

export type CalendarWindow = {
  id: string;
  culture: string;
  role: "coffee" | "cover" | "intercrop";
  activity: string;
  startMonth: number;
  endMonth: number;
  strategyIds: StrategyId[];
  why: string;
  observe: string;
  source: DataSource;
};

export const LOCAL_SOURCE: DataSource = {
  status: "local",
  label: "Referência local — sem atualização automática",
  limitations: "Confirme o dado no talhão antes de decidir o manejo.",
};

export const DEFAULT_PROFILE: FarmProfile = {
  schemaVersion: 1,
  name: "Seu Antônio",
  city: "Pimenta Bueno · RO",
  coffeeType: "Robusta/Conilon",
  varieties: ["BRS 1216"],
  coffeePlants: 7200,
  ageBand: "3 a 8 anos",
  interrowSpacingM: 3,
  interrowCrops: ["Feijão"],
  areaHa: 12,
  irrigation: "none",
  currentManagement: "spontaneous",
  soilExposure: "medium",
  goal: "water",
  managementCapacity: "medium",
  location: { description: "Município informado na conversa", precision: "user-selected" },
};

export const STRATEGIES: Record<
  StrategyId,
  { label: string; short: string; description: string; change: string }
> = {
  conventional: {
    label: "Convencional",
    short: "Café em foco",
    description: "Café conduzido sem cobertura ou cultura adicional nas entrelinhas.",
    change: "Mantemos apenas as faixas do café. Clima e perfil não mudam.",
  },
  cover: {
    label: "Com cobertura",
    short: "Solo coberto",
    description: "Cobertura vegetal nas entrelinhas para manter o solo protegido.",
    change: "Acrescentamos a faixa de cobertura. Clima e café permanecem iguais.",
  },
  intercrop: {
    label: "Entrelinhas",
    short: "Cultivo intercalar",
    description: "Culturas de ciclo curto nas entrelinhas, conforme idade e espaço do cafezal.",
    change:
      "Acrescentamos três possibilidades de plantio nas entrelinhas. Clima e café permanecem iguais.",
  },
};

export const FIXED_METRICS: Metric[] = [
  {
    id: "rain",
    label: "Chuva acumulada",
    value: "42",
    unit: "mm",
    period: "período de 7 dias",
    tooltip:
      "Referência de chuva do período. Compare com o pluviômetro ou registro da propriedade.",
    source: LOCAL_SOURCE,
  },
  {
    id: "temperature",
    label: "Temperatura média",
    value: "26,4",
    unit: "°C",
    period: "referência diária",
    tooltip: "Temperatura média de referência para a leitura do período.",
    source: LOCAL_SOURCE,
  },
  {
    id: "soil-moisture",
    label: "Umidade estimada do solo",
    value: "31",
    unit: "%",
    period: "camada superficial",
    tooltip: "Estimativa de referência. A necessidade de irrigação depende da medição no talhão.",
    source: LOCAL_SOURCE,
  },
];

export const STRATEGY_METRICS: Record<StrategyId, Metric[]> = {
  conventional: [
    {
      id: "soil",
      label: "Proteção do solo",
      value: "Sem cobertura planejada",
      tooltip: "Cenário-base para comparação, sem classificar o manejo como melhor ou pior.",
      source: LOCAL_SOURCE,
    },
    {
      id: "water",
      label: "Competição por água",
      value: "Referência do café",
      tooltip: "Não há cultura adicional representada neste cenário.",
      source: LOCAL_SOURCE,
    },
    {
      id: "diversity",
      label: "Diversificação",
      value: "Sem espécie intercalar",
      tooltip: "A tela não avalia biodiversidade nem retorno econômico.",
      source: LOCAL_SOURCE,
    },
  ],
  cover: [
    {
      id: "soil",
      label: "Proteção do solo",
      value: "Cobertura planejada",
      tooltip: "Representa apenas a presença planejada de cobertura, sem medir efeito real.",
      source: LOCAL_SOURCE,
    },
    {
      id: "water",
      label: "Competição por água",
      value: "Avaliar espécie e manejo",
      tooltip: "A competição depende da espécie, fase, solo e manejo local.",
      source: LOCAL_SOURCE,
    },
    {
      id: "diversity",
      label: "Diversificação",
      value: "Espécie de cobertura",
      tooltip: "Cenário qualitativo; nenhuma espécie é recomendada automaticamente.",
      source: LOCAL_SOURCE,
    },
  ],
  intercrop: [
    {
      id: "soil",
      label: "Proteção do solo",
      value: "Entrelinha manejada",
      tooltip: "Representa um plano de uso da entrelinha, não um resultado medido.",
      source: LOCAL_SOURCE,
    },
    {
      id: "water",
      label: "Competição por água",
      value: "Avaliar consumo da cultura",
      tooltip: "Café adulto e outra cultura podem competir; procure assistência técnica local.",
      source: LOCAL_SOURCE,
    },
    {
      id: "diversity",
      label: "Diversificação",
      value: "Cultura intercalar",
      tooltip: "A viabilidade depende do espaço, idade do café, água e objetivo do produtor.",
      source: LOCAL_SOURCE,
    },
  ],
};

const ALL: StrategyId[] = ["conventional", "cover", "intercrop"];

const EMBRAPA_INTERCROP_SOURCE: DataSource = {
  status: "local",
  label: "Opções de cultivo citadas pela Embrapa",
  provider: "Embrapa",
  url: "https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1023755/1/LivroCafenaAmazoniaDigital2015.pdf",
  limitations:
    "As faixas de meses são referências locais. Idade, espaçamento, água, solo e histórico de nematoides precisam de avaliação técnica.",
};

const ZARC_COFFEE_SOURCE: DataSource = {
  status: "verified",
  label: "ZARC Oficial — Café Canéfora Implantação, sequeiro",
  provider: "Ministério da Agricultura e Pecuária",
  observedAt: "2026-11-14",
  url: "https://mapa-indicadores.agricultura.gov.br/publico/extensions/Zarc/Zarc.html",
  limitations:
    "Faixa mensal consolidada para Pimenta Bueno (RO), Grupo I e classes AD1–AD6. O resultado oficial é publicado por decêndio e varia conforme a classe de água disponível do solo.",
};

export const CALENDAR_WINDOWS: CalendarWindow[] = [
  {
    id: "coffee-planting",
    culture: "Café",
    role: "coffee",
    activity: "Plantio recomendado",
    startMonth: 2 + 2 / 3,
    endMonth: 7 + 1 / 3,
    strategyIds: ALL,
    why: "Período consolidado da consulta de implantação do café canéfora em sequeiro para Pimenta Bueno.",
    observe:
      "Confirme a classe AD do solo e os decêndios aplicáveis no painel oficial antes de decidir o plantio.",
    source: ZARC_COFFEE_SOURCE,
  },
  {
    id: "cover-planting",
    culture: "Cobertura do solo",
    role: "cover",
    activity: "Plantio",
    startMonth: 8,
    endMonth: 12,
    strategyIds: ["cover"],
    why: "A faixa torna visível o que muda neste cenário comparativo.",
    observe: "Espécie, disponibilidade de água e forma de manejo com apoio técnico.",
    source: LOCAL_SOURCE,
  },
  {
    id: "intercrop-bean",
    culture: "Feijão",
    role: "intercrop",
    activity: "Plantio",
    startMonth: 9,
    endMonth: 13,
    strategyIds: ["intercrop"],
    why: "É uma cultura anual de baixo porte citada pela Embrapa para intercultivo em cafezais jovens.",
    observe:
      "Antes de considerar: idade e espaçamento do café, disponibilidade de água e histórico de nematoides.",
    source: EMBRAPA_INTERCROP_SOURCE,
  },
  {
    id: "intercrop-rice",
    culture: "Arroz",
    role: "intercrop",
    activity: "Plantio",
    startMonth: 9,
    endMonth: 12,
    strategyIds: ["intercrop"],
    why: "É uma possibilidade de cultura anual citada pela Embrapa para entrelinhas de cafezais jovens.",
    observe: "Espaço livre, acesso ao cafezal, água disponível e possível competição com o café.",
    source: EMBRAPA_INTERCROP_SOURCE,
  },
  {
    id: "intercrop-pineapple",
    culture: "Abacaxi",
    role: "intercrop",
    activity: "Plantio",
    startMonth: 10,
    endMonth: 14,
    strategyIds: ["intercrop"],
    why: "A Embrapa apresenta o abacaxi como frutífera de ciclo curto em cultivo intercalar com café.",
    observe:
      "Espaçamento, circulação, sombreamento, água e compatibilidade com as operações do cafezal.",
    source: EMBRAPA_INTERCROP_SOURCE,
  },
];

export const FLASHCARDS = [
  {
    id: "cover-vs-intercrop",
    category: "Entrelinhas",
    question: "Cobertura e consórcio são a mesma coisa?",
    answer:
      "Não. A cobertura prioriza proteger o solo; o consórcio também considera o uso ou a colheita de outra cultura.",
    term: "Cultura de cobertura",
    definition: "Planta usada principalmente para proteger e melhorar as condições do solo.",
  },
  {
    id: "satellite-rain",
    category: "Água",
    question: "Chuva por satélite é igual à chuva no meu sítio?",
    answer:
      "Não exatamente. Ela ajuda a enxergar uma área maior, mas pode diferir do que caiu no seu talhão.",
    term: "Chuva estimada",
    definition: "Estimativa para uma área; não substitui uma medição local.",
  },
  {
    id: "soil-test",
    category: "Solo",
    question: "Por que uma análise de solo ajuda?",
    answer:
      "Ela mostra características químicas da amostra. A interpretação e qualquer correção devem ser feitas com assistência técnica.",
    term: "Análise de solo",
    definition: "Exame de uma amostra coletada de forma adequada e enviada a laboratório.",
  },
  {
    id: "coffee-records",
    category: "Café",
    question: "Por que registrar o que observo?",
    answer:
      "Registros ajudam a comparar épocas e talhões. Eles não substituem uma avaliação técnica, mas deixam a conversa mais objetiva.",
    term: "Histórico da lavoura",
    definition: "Conjunto de observações e manejos anotados ao longo do tempo.",
  },
  {
    id: "satellite-vegetation",
    category: "Satélite",
    question: "O satélite consegue enxergar a qualidade do solo?",
    answer:
      "Não diretamente. Ele observa chuva, temperatura e resposta da vegetação; a análise de solo confirma o que acontece no chão.",
    term: "Indicador orbital",
    definition:
      "Medida calculada a partir de observações remotas e interpretada junto com dados do campo.",
  },
] as const;

export function readFarmProfile(value: unknown): FarmProfile {
  if (!value || typeof value !== "object") return DEFAULT_PROFILE;
  const p = value as Partial<FarmProfile>;
  const profile: FarmProfile = {
    schemaVersion: 1,
    name: typeof p.name === "string" && p.name.trim() ? p.name : DEFAULT_PROFILE.name,
    city: typeof p.city === "string" && p.city.trim() ? p.city : DEFAULT_PROFILE.city,
    coffeeType:
      typeof p.coffeeType === "string" && p.coffeeType.trim()
        ? p.coffeeType
        : DEFAULT_PROFILE.coffeeType,
    varieties:
      Array.isArray(p.varieties) && p.varieties.every((v) => typeof v === "string")
        ? p.varieties
        : [],
    coffeePlants: typeof p.coffeePlants === "number" && p.coffeePlants >= 0 ? p.coffeePlants : null,
    ageBand: typeof p.ageBand === "string" ? p.ageBand : "",
    interrowSpacingM:
      typeof p.interrowSpacingM === "number" && p.interrowSpacingM > 0 ? p.interrowSpacingM : null,
    interrowCrops:
      Array.isArray(p.interrowCrops) && p.interrowCrops.every((v) => typeof v === "string")
        ? p.interrowCrops
        : [],
    areaHa: typeof p.areaHa === "number" && p.areaHa >= 0 ? p.areaHa : null,
    irrigation: p.irrigation ?? "none",
    currentManagement: p.currentManagement ?? "spontaneous",
    soilExposure: p.soilExposure ?? "medium",
    goal: p.goal ?? "water",
    managementCapacity: p.managementCapacity ?? "medium",
  };
  if (p.location && typeof p.location.description === "string") profile.location = p.location;
  return profile;
}

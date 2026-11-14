import type { FarmProfile } from "./cereja-demo";

export type EvidenceKind = "producer" | "nasa" | "agronomic";
export type EvidenceStatus = "informed" | "simulated" | "reference";

export type Evidence = {
  id: string;
  label: string;
  value: string;
  plainLanguage: string;
  technicalDetail: string;
  source: string;
  sourceUrl?: string;
  resolution?: string;
  kind: EvidenceKind;
  status: EvidenceStatus;
  changes: string;
};

export type FarmContext = {
  id: string;
  name: string;
  city: string;
  coffeeType: string;
  ageBand: string;
  rowSpacingM: number;
  irrigation: "none" | "drip" | "other";
  currentManagement: "exposed" | "spontaneous" | "cover";
  soilExposure: "low" | "medium" | "high";
  goal: "water" | "erosion" | "biomass" | "simplicity";
  managementCapacity: "low" | "medium" | "high";
  waterRisk: "low" | "medium" | "high";
  heavyRainRisk: "medium" | "high";
  drySeason: string;
  evidence: Evidence[];
};

const commonEvidence = {
  seasonality: {
    id: "seasonality",
    label: "Ritmo das chuvas",
    technicalDetail: "Precipitação diária/regional; fixture inspirada em POWER/IMERG.",
    source: "NASA POWER + GPM/IMERG",
    sourceUrl: "https://power.larc.nasa.gov/docs/methodology/",
    resolution: "aprox. 10 km para IMERG",
    kind: "nasa" as const,
    status: "simulated" as const,
    changes: "altera a janela de estabelecimento e a cautela na transição para a seca",
  },
  moisture: {
    id: "moisture",
    label: "Água na superfície",
    technicalDetail: "Umidade superficial regional; fixture inspirada em SMAP L4.",
    source: "NASA SMAP L4",
    sourceUrl: "https://power.larc.nasa.gov/docs/methodology/",
    resolution: "aprox. 9 km",
    kind: "nasa" as const,
    status: "simulated" as const,
    changes: "altera a ressalva de competição por água",
  },
  future: {
    id: "future",
    label: "Pressão de calor futura",
    technicalDetail: "Cenário climático ilustrativo; NEX-GDDP-CMIP6 possui grade de 0,25°.",
    source: "NASA NEX-GDDP-CMIP6",
    sourceUrl: "https://nccs.smce.nasa.gov/data-collections/nex-gddp-cmip6/",
    resolution: "aprox. 25 km",
    kind: "nasa" as const,
    status: "simulated" as const,
    changes: "eleva a prioridade de estratégias de adaptação, sem definir espécie sozinha",
  },
};

export const DEMO_FARMS: FarmContext[] = [
  {
    id: "cacoal-rainfed",
    name: "Talhão Boa Vista",
    city: "Cacoal · RO",
    coffeeType: "Canéfora adulto",
    ageBand: "Mais de 8 anos",
    rowSpacingM: 3,
    irrigation: "none",
    currentManagement: "spontaneous",
    soilExposure: "medium",
    goal: "water",
    managementCapacity: "medium",
    waterRisk: "high",
    heavyRainRisk: "high",
    drySeason: "junho a agosto",
    evidence: [
      {
        ...commonEvidence.seasonality,
        value: "seca bem marcada",
        plainLanguage: "A chuva cai bastante no verão e diminui rápido entre junho e agosto.",
      },
      {
        ...commonEvidence.moisture,
        value: "tendência de queda",
        plainLanguage: "O sinal regional de água na superfície enfraquece na entrada da seca.",
      },
      {
        ...commonEvidence.future,
        value: "mais calor na seca",
        plainLanguage: "O cenário futuro reforça a importância de evitar solo descoberto.",
      },
      {
        id: "producer-water",
        label: "Irrigação",
        value: "não possui",
        plainLanguage:
          "A cobertura depende da chuva e precisa ser manejada para não disputar água.",
        technicalDetail: "Informação declarada pelo produtor.",
        source: "Conversa com o produtor",
        kind: "producer",
        status: "informed",
        changes: "aumenta a cautela com coberturas vivas persistentes na seca",
      },
    ],
  },
  {
    id: "rolim-irrigated",
    name: "Talhão Linha 180",
    city: "Rolim de Moura · RO",
    coffeeType: "Canéfora em produção",
    ageBand: "3 a 8 anos",
    rowSpacingM: 3.5,
    irrigation: "drip",
    currentManagement: "exposed",
    soilExposure: "high",
    goal: "erosion",
    managementCapacity: "high",
    waterRisk: "medium",
    heavyRainRisk: "high",
    drySeason: "junho a agosto",
    evidence: [
      {
        ...commonEvidence.seasonality,
        value: "chuva concentrada",
        plainLanguage: "Chuva forte no verão encontra parte das entrelinhas sem proteção.",
      },
      {
        ...commonEvidence.moisture,
        value: "apoio da irrigação",
        plainLanguage: "A irrigação declarada reduz parte do risco de estabelecimento.",
      },
      {
        ...commonEvidence.future,
        value: "calor crescente",
        plainLanguage: "Proteger a superfície ganha importância num ambiente mais quente.",
      },
      {
        id: "producer-irrigation",
        label: "Irrigação",
        value: "gotejamento",
        plainLanguage:
          "A água manejada amplia a segurança de implantação, mas não elimina competição.",
        technicalDetail:
          "Informação declarada pelo produtor; confirmar operação e lâmina aplicada.",
        source: "Conversa com o produtor",
        kind: "producer",
        status: "informed",
        changes: "reduz a ressalva de estabelecimento para coberturas vivas",
      },
      {
        id: "producer-exposure",
        label: "Solo entre as linhas",
        value: "muito exposto",
        plainLanguage: "O produtor informou pouca cobertura após as operações de manejo.",
        technicalDetail: "Informação declarada; confirmar em visita ou imagem adequada.",
        source: "Conversa com o produtor",
        kind: "producer",
        status: "informed",
        changes: "aumenta a prioridade de estabelecer cobertura contínua",
      },
    ],
  },
];

export function contextFromProfile(profile: FarmProfile): FarmContext {
  const template = /rolim/i.test(profile.city) ? DEMO_FARMS[1]! : DEMO_FARMS[0]!;
  return {
    ...template,
    id: "producer-profile",
    name: profile.name ? `Talhão de ${profile.name.split(/\s+/)[0]}` : "Meu talhão",
    city: profile.city,
    coffeeType: profile.coffeeType,
    ageBand: profile.ageBand,
    rowSpacingM: profile.interrowSpacingM ?? template.rowSpacingM,
    irrigation: profile.irrigation ?? template.irrigation,
    currentManagement: profile.currentManagement ?? template.currentManagement,
    soilExposure: profile.soilExposure ?? template.soilExposure,
    goal: profile.goal ?? template.goal,
    managementCapacity: profile.managementCapacity ?? template.managementCapacity,
    waterRisk:
      (profile.irrigation ?? template.irrigation) === "none" ? template.waterRisk : "medium",
    evidence: template.evidence.map((item) =>
      item.kind === "producer"
        ? {
            ...item,
            value: "informado na conversa",
            plainLanguage: "Este fator veio das respostas do produtor e participa das regras.",
          }
        : item,
    ),
  };
}

export const EMBRAPA_EVIDENCE: Evidence = {
  id: "embrapa-management",
  label: "Regra de manejo",
  value: "manter solo coberto sem competir com o café",
  plainLanguage: "Cobertura ajuda, mas espécie, água, idade e manejo precisam combinar.",
  technicalDetail:
    "A Embrapa orienta considerar idade, espaçamento, disponibilidade de água, clima, solo e recursos do produtor.",
  source: "Embrapa · Café na Amazônia",
  sourceUrl:
    "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1040714/1/Cafe-na-AmazoniaSANTOS.pdf",
  kind: "agronomic",
  status: "reference",
  changes: "impede recomendação universal e adiciona filtros de competição e capacidade de manejo",
};

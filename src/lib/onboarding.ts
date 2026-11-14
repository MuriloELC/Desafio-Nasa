import type { FarmProfile } from "@/demo/cereja-demo";

export type Answers = {
  name: string;
  city: string;
  territoryPolygon: Array<{ x: number; y: number }>;
  coffee: string;
  age: string;
  rowSpacing: string;
  irrigation: string;
  currentManagement: string;
  soilExposure: string;
  goal: string;
  managementCapacity: string;
};

export const EMPTY_ANSWERS: Answers = {
  name: "",
  city: "",
  territoryPolygon: [],
  coffee: "",
  age: "",
  rowSpacing: "",
  irrigation: "",
  currentManagement: "",
  soilExposure: "",
  goal: "",
  managementCapacity: "",
};

export const CITIES = [
  "Alta Floresta d’Oeste · RO",
  "Ariquemes · RO",
  "Cacoal · RO",
  "Ji-Paraná · RO",
  "Pimenta Bueno · RO",
  "Porto Velho · RO",
  "Rolim de Moura · RO",
  "São Miguel do Guaporé · RO",
  "Vilhena · RO",
];

export const QUESTIONS = [
  "Como posso te chamar?",
  "Em qual município de Rondônia fica a propriedade?",
  "Agora marque o talhão no mapa. Toque nos limites para formar o polígono.",
  "Qual tipo de café você cultiva?",
  "Há quanto tempo esse cafezal está plantado?",
  "Qual é a distância aproximada entre as linhas do café? Resposta em metros.",
  "A lavoura possui irrigação?",
  "Como você cuida das entrelinhas hoje?",
  "Depois do manejo, quanto solo costuma ficar descoberto?",
  "O que você mais quer melhorar agora?",
  "Com que frequência você consegue manejar a cobertura?",
] as const;

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function validPositiveNumber(value: string) {
  const number = Number(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(number) && number > 0;
}

export function answerText(step: number, answers: Answers) {
  return (
    [
      answers.name,
      answers.city,
      answers.territoryPolygon.length >= 3
        ? `Talhão delimitado · ${answers.territoryPolygon.length} pontos`
        : "",
      answers.coffee,
      answers.age,
      answers.rowSpacing && /m/i.test(answers.rowSpacing)
        ? answers.rowSpacing
        : answers.rowSpacing
          ? `${answers.rowSpacing} m`
          : "",
      answers.irrigation,
      answers.currentManagement,
      answers.soilExposure,
      answers.goal,
      answers.managementCapacity,
    ][step] ?? ""
  );
}

export function updateAnswer(answers: Answers, step: number, value: string): Answers {
  const next = { ...answers };
  if (step === 0) next.name = value;
  if (step === 1) next.city = value;
  if (step === 3) next.coffee = value;
  if (step === 4) next.age = value;
  if (step === 5) next.rowSpacing = value;
  if (step === 6) next.irrigation = value;
  if (step === 7) next.currentManagement = value;
  if (step === 8) next.soilExposure = value;
  if (step === 9) next.goal = value;
  if (step === 10) next.managementCapacity = value;
  return next;
}

export function updateTerritory(
  answers: Answers,
  polygon: Array<{ x: number; y: number }>,
): Answers {
  return { ...answers, territoryPolygon: polygon };
}

const irrigationValue = (value: string): FarmProfile["irrigation"] => {
  if (/gotejamento/i.test(value)) return "drip";
  if (/não possui|não tenho/i.test(value)) return "none";
  return "other";
};
const managementValue = (value: string): FarmProfile["currentManagement"] => {
  if (/exposto|capina total/i.test(value)) return "exposed";
  if (/plantada|braquiária|cobertura viva/i.test(value)) return "cover";
  return "spontaneous";
};
const exposureValue = (value: string): FarmProfile["soilExposure"] => {
  if (/muito/i.test(value)) return "high";
  if (/pouco/i.test(value)) return "low";
  return "medium";
};
const goalValue = (value: string): FarmProfile["goal"] => {
  if (/erosão|chuva/i.test(value)) return "erosion";
  if (/biomassa|matéria/i.test(value)) return "biomass";
  if (/simples|custo/i.test(value)) return "simplicity";
  return "water";
};
const capacityValue = (value: string): FarmProfile["managementCapacity"] => {
  if (/frequente|mensal/i.test(value)) return "high";
  if (/pouca|raramente/i.test(value)) return "low";
  return "medium";
};

export function calendarProfile(answers: Answers): FarmProfile {
  const rowSpacing = Number(answers.rowSpacing.replace(/[^\d,.-]/g, "").replace(",", "."));
  return {
    schemaVersion: 1,
    name: answers.name || "Produtor",
    city: answers.city || "Município não informado · RO",
    coffeeType: answers.coffee || "Café não informado",
    varieties: [],
    coffeePlants: null,
    ageBand: answers.age,
    interrowSpacingM: Number.isFinite(rowSpacing) && rowSpacing > 0 ? rowSpacing : null,
    interrowCrops: [],
    areaHa: null,
    irrigation: irrigationValue(answers.irrigation),
    currentManagement: managementValue(answers.currentManagement),
    soilExposure: exposureValue(answers.soilExposure),
    goal: goalValue(answers.goal),
    managementCapacity: capacityValue(answers.managementCapacity),
    location: {
      description: "Talhão delimitado pelo produtor",
      precision: "user-selected",
      polygon: answers.territoryPolygon,
    },
  };
}

export function isStoredAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Answers>;
  return (
    [
      "name",
      "city",
      "coffee",
      "age",
      "rowSpacing",
      "irrigation",
      "currentManagement",
      "soilExposure",
      "goal",
      "managementCapacity",
    ].every((key) => typeof candidate[key as keyof Answers] === "string") &&
    Array.isArray(candidate.territoryPolygon)
  );
}

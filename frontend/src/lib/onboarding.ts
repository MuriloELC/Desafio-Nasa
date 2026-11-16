import type { FieldInput } from "@/lib/cereja-api";

export type Answers = {
  name: string;
  city: string;
  territoryPolygon: Array<{ x: number; y: number }>;
  latitude: number | null;
  longitude: number | null;
  coffee: string;
  age: string;
  rowSpacing: string;
  irrigation: string;
  currentManagement: string;
  soilExposure: string;
  goal: string;
  managementCapacity: string;
  phase: string;
  soilPh: string;
};

export const EMPTY_ANSWERS: Answers = {
  name: "",
  city: "",
  territoryPolygon: [],
  latitude: null,
  longitude: null,
  coffee: "",
  age: "",
  rowSpacing: "",
  irrigation: "",
  currentManagement: "",
  soilExposure: "",
  goal: "",
  managementCapacity: "",
  phase: "",
  soilPh: "",
};

export const CITIES = ["Cacoal · RO"];

export const QUESTIONS = [
  "Como posso te chamar?",
  "A área piloto é Cacoal, RO. Sua propriedade fica nessa região?",
  "Marque um ponto real do talhão na grade de Cacoal ou informe as coordenadas.",
  "Qual tipo de café você cultiva?",
  "Qual é a idade aproximada do cafezal, em anos?",
  "Qual é a distância aproximada entre as linhas do café? Resposta em metros.",
  "A lavoura possui irrigação?",
  "Como você cuida das entrelinhas hoje?",
  "Depois do manejo, quanto solo costuma ficar descoberto?",
  "O que você mais quer melhorar agora?",
  "Com que frequência você consegue manejar a cobertura?",
  "Em que fase está o café?",
  "Qual foi o pH medido em análise local do talhão? Se não tiver análise, usaremos a estimativa regional do SoilGrids.",
] as const;

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function supportsPilotCoffee(value: string) {
  return /robusta|conilon|can.fora/i.test(value);
}

export function parseFieldNumber(value: string, min: number, max: number): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function parseSpacingM(value: string): number | null {
  const match = /^(\d+(?:[,.]\d+)?)\s*(?:m|metros?)?$/i.exec(value.trim());
  return match?.[1] ? parseFieldNumber(match[1], 0.01, 30) : null;
}

export function assessmentField(answers: Answers): FieldInput {
  const phase =
    (
      {
        Implantação: "implantacao",
        Formação: "formacao",
        Produção: "producao",
        Recepa: "recepa",
      } as Record<string, FieldInput["phase"]>
    )[answers.phase] ?? null;
  return {
    strategy: null,
    goal:
      (
        {
          "Conservar água": "conservar_agua",
          "Reduzir erosão": "reduzir_erosao",
          "Produzir biomassa": "produzir_biomassa",
          "Simplificar o manejo": "simplificar_manejo",
        } as Record<string, FieldInput["goal"]>
      )[answers.goal] ?? null,
    phase,
    water: /não possui|não tenho/i.test(answers.irrigation)
      ? "sequeiro"
      : /gotejamento|outro sistema/i.test(answers.irrigation)
        ? "irrigado"
        : null,
    age_years: parseFieldNumber(answers.age, 0, 100),
    spacing_m: parseSpacingM(answers.rowSpacing),
    soil_ph: parseFieldNumber(answers.soilPh, 0, 14),
    can_manage: /frequente|mensal|2[–-]3 meses/i.test(answers.managementCapacity)
      ? true
      : /pouca/i.test(answers.managementCapacity)
        ? false
        : null,
  };
}

export function answerText(step: number, answers: Answers) {
  return (
    [
      answers.name,
      answers.city,
      answers.latitude !== null && answers.longitude !== null
        ? `Ponto ${answers.latitude.toFixed(5)}, ${answers.longitude.toFixed(5)}`
        : "",
      answers.coffee,
      answers.age,
      answers.rowSpacing === "Não sei"
        ? answers.rowSpacing
        : answers.rowSpacing && /m/i.test(answers.rowSpacing)
          ? answers.rowSpacing
          : answers.rowSpacing
            ? `${answers.rowSpacing} m`
            : "",
      answers.irrigation,
      answers.currentManagement,
      answers.soilExposure,
      answers.goal,
      answers.managementCapacity,
      answers.phase,
      answers.soilPh,
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
  if (step === 11) next.phase = value;
  if (step === 12) next.soilPh = value;
  return next;
}

export function updateTerritory(
  answers: Answers,
  location: { lat: number; lon: number; x: number; y: number },
): Answers {
  return {
    ...answers,
    latitude: location.lat,
    longitude: location.lon,
    territoryPolygon: [{ x: location.x, y: location.y }],
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
      "phase",
      "soilPh",
    ].every((key) => typeof candidate[key as keyof Answers] === "string") &&
    Array.isArray(candidate.territoryPolygon) &&
    (candidate.latitude === null ||
      (typeof candidate.latitude === "number" &&
        Number.isFinite(candidate.latitude) &&
        Math.abs(candidate.latitude) <= 90)) &&
    (candidate.longitude === null ||
      (typeof candidate.longitude === "number" &&
        Number.isFinite(candidate.longitude) &&
        Math.abs(candidate.longitude) <= 180))
  );
}

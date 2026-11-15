import { describe, expect, it } from "vitest";
import {
  CITIES,
  EMPTY_ANSWERS,
  QUESTIONS,
  assessmentField,
  isStoredAnswers,
  supportsPilotCoffee,
  updateAnswer,
  parseSpacingM,
  parseFieldNumber,
} from "./onboarding";

describe("conversa orientada à decisão", () => {
  it("restringe as sugestões a Rondônia", () => {
    expect(CITIES.every((city) => city.endsWith("· RO"))).toBe(true);
  });

  it("valida o espaçamento em metros conforme os limites da API", () => {
    expect(parseSpacingM("3,5 m")).toBe(3.5);
    expect(parseSpacingM("31 m")).toBeNull();
    expect(parseSpacingM("3 m por 4 m")).toBeNull();
    expect(parseSpacingM("0")).toBeNull();
    expect(assessmentField({ ...EMPTY_ANSWERS, rowSpacing: "Não sei" }).spacing_m).toBeNull();
  });

  it("leva as respostas de campo à API sem criar medidas ausentes", () => {
    const field = assessmentField({
      ...EMPTY_ANSWERS,
      age: "2,5",
      phase: "Formação",
      rowSpacing: "3,5 m",
      irrigation: "Não possui",
      soilPh: "4,8",
      nematodes: "Não",
      managementCapacity: "A cada 2–3 meses",
      soilAssessed: "Sim",
      moistureChecked: "Não sei",
    });
    expect(field).toEqual({
      phase: "formacao",
      age_years: 2.5,
      spacing_m: 3.5,
      water: "sequeiro",
      soil_ph: 4.8,
      nematodes: false,
      can_manage: true,
      soil_assessed: true,
      moisture_checked: null,
    });
    expect(assessmentField(EMPTY_ANSWERS)).toMatchObject({
      soil_ph: null,
      age_years: null,
      phase: null,
    });
    expect(parseFieldNumber("1 a 3 anos", 0, 100)).toBeNull();
  });

  it("não consulta coordenadas inválidas restauradas do navegador", () => {
    expect(isStoredAnswers({ ...EMPTY_ANSWERS, latitude: -11.44, longitude: -61.45 })).toBe(true);
    expect(isStoredAnswers({ ...EMPTY_ANSWERS, latitude: 999, longitude: -61.45 })).toBe(false);
    expect(isStoredAnswers({ ...EMPTY_ANSWERS, latitude: NaN, longitude: -61.45 })).toBe(false);
  });

  it("limita a comparação ao café Canéfora do catálogo piloto", () => {
    expect(supportsPilotCoffee("Robusta/Conilon")).toBe(true);
    expect(supportsPilotCoffee("Café Canéfora")).toBe(true);
    expect(supportsPilotCoffee("Arábica")).toBe(false);
    expect(supportsPilotCoffee("Não sei")).toBe(false);
  });

  it("edita um campo sem apagar respostas seguintes", () => {
    const filled = { ...EMPTY_ANSWERS, name: "Lucas", city: "Cacoal · RO", coffee: "Conilon" };
    expect(updateAnswer(filled, 0, "Luís")).toMatchObject({
      name: "Luís",
      city: "Cacoal · RO",
      coffee: "Conilon",
    });
  });

  it("pergunta apenas fatores que mudam a avaliação", () => {
    expect(QUESTIONS.join(" ")).toMatch(/irrigação/i);
    expect(QUESTIONS.join(" ")).toMatch(/solo.*descoberto/i);
    expect(QUESTIONS.join(" ")).toMatch(/melhorar/i);
    expect(QUESTIONS.join(" ")).toMatch(/frequência.*manejar/i);
    expect(QUESTIONS.join(" ")).not.toMatch(/quantos pés|hectares/i);
  });
});

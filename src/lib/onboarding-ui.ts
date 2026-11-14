export const ANSWER_LABELS = [
  "Nome",
  "Município",
  "Talhão",
  "Tipo de café",
  "Idade do cafezal",
  "Distância entre linhas",
  "Irrigação",
  "Manejo atual",
  "Solo exposto",
  "Objetivo",
  "Rotina de manejo",
] as const;

export function quickReplies(step: number): string[] {
  if (step === 3) return ["Robusta/Conilon", "Arábica", "Não sei"];
  if (step === 4)
    return ["Menos de 1 ano", "1 a 3 anos", "3 a 8 anos", "Mais de 8 anos", "Não sei"];
  if (step === 5) return ["2,5 m", "3 m", "3,5 m ou mais"];
  if (step === 6) return ["Não possui", "Gotejamento", "Outro sistema", "Não sei"];
  if (step === 7)
    return ["Solo exposto / capina total", "Vegetação espontânea roçada", "Cobertura plantada"];
  if (step === 8) return ["Pouco", "Parte da entrelinha", "Muito"];
  if (step === 9)
    return ["Conservar água", "Reduzir erosão", "Produzir biomassa", "Simplificar o manejo"];
  if (step === 10) return ["Pouca disponibilidade", "A cada 2–3 meses", "Manejo frequente"];
  return [];
}

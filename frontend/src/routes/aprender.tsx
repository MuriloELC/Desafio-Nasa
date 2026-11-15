import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/cereja-shell";
import { calendar, diagnosis, type Calendar } from "@/lib/cereja-api";
import { isStoredAnswers } from "@/lib/onboarding";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";

export const Route = createFileRoute("/aprender")({
  head: () => ({
    meta: [
      { title: "Aprender · Cerejá" },
      {
        name: "description",
        content: "Orientações publicadas para conservação do solo e manejo das entrelinhas.",
      },
    ],
  }),
  component: LearnPage,
});

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function LearnPage() {
  const [reference, setReference] = useState<Calendar | null>(null);
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let code: string | null = null;
      try {
        const saved: unknown = JSON.parse(
          localStorage.getItem(ANSWERS_STORAGE_KEY) ?? "null",
        )?.answers;
        if (isStoredAnswers(saved) && saved.latitude !== null && saved.longitude !== null) {
          const place = await diagnosis(saved.latitude, saved.longitude, controller.signal);
          if (place.inside) code = place.municipality;
        }
      } catch {
        // O calendário regional continua disponível sem perfil ou diagnóstico.
      }
      if (controller.signal.aborted) return;
      const data = await calendar(code, controller.signal);
      setMunicipality(code);
      setMonth(data.today_month ?? data.months[0] ?? 1);
      setReference(data);
    }
    void load().catch((reason: unknown) => {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : "Calendário indisponível.");
    });
    return () => controller.abort();
  }, []);
  const rules = reference?.rules.filter((rule) => rule.months.includes(month)) ?? [];
  return (
    <AppPage>
      <header className="border-b border-border pb-8">
        <p className="eyebrow">Aprender com fontes</p>
        <h1 className="display-soft mt-3 text-5xl sm:text-7xl">
          Solo protegido, decisão informada.
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          O guia mensal reúne orientações técnicas publicadas para café e entrelinhas. Use as regras
          junto com as observações do seu talhão e com assistência técnica.
        </p>
        <Link to="/minha-terra" className="mt-5 inline-block text-cherry underline">
          Ver observações da minha terra
        </Link>
      </header>
      <section className="py-8">
        <h2 className="display-soft text-4xl">Conservar o solo</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          A proposta educativa da equipe Anab destaca cobertura, palhada e acompanhamento da água ao
          longo do ano. As orientações abaixo vêm do calendário técnico cadastrado e mostram sua
          fonte e versão. Sistemas agroflorestais podem ser estudados com assistência local; o
          avaliador atual não calcula seu desempenho.
        </p>
        {!reference && !error ? (
          <p role="status" className="mt-5">
            Carregando regras publicadas…
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-5 rounded-xl bg-cherry/10 p-4 text-cherry">
            {error}
          </p>
        ) : null}
      </section>
      {reference ? (
        <section className="border-t border-border py-8">
          <h2 className="display-soft text-4xl">Calendário de referência</h2>
          <p className="mt-2 text-muted-foreground">
            Safra {reference.year}/{reference.year + 1} · escopo {municipality ?? "regional"} · mês
            selecionado: {MONTHS[month - 1]}. O calendário indica janelas de referência; confira
            chuva e umidade no campo antes de agir.
          </p>
          <div
            className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12"
            aria-label="Meses da safra"
          >
            {reference.months.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={month === value}
                onClick={() => setMonth(value)}
                className={`min-h-12 rounded-xl border px-2 font-semibold ${month === value ? "border-cherry bg-card text-cherry" : "border-border bg-paper"}`}
              >
                {MONTHS[value - 1]}
              </button>
            ))}
          </div>
          {rules.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {rules.map((rule) => (
                <article
                  key={`${rule.rule_id}-${rule.version}`}
                  className="rounded-2xl border border-border bg-paper p-5"
                >
                  <p className="eyebrow">Referência · regra v{rule.version}</p>
                  <h3 className="mt-2 text-xl font-semibold">
                    {reference.cultures.find((culture) => culture.culture_id === rule.culture_id)
                      ?.name ?? rule.culture_id}{" "}
                    · {rule.activity}
                  </h3>
                  <p className="mt-3">{rule.orientation}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Fase: {rule.phase} · água: {rule.water} · escopo:{" "}
                    {rule.municipality ?? rule.uf ?? "geral"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rule.starts_on && rule.ends_on
                      ? `Janela: ${rule.starts_on} a ${rule.ends_on}`
                      : `Meses de referência: ${rule.months.map((value) => MONTHS[value - 1]).join(", ")}`}
                  </p>
                  <a
                    href={rule.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-cherry underline"
                  >
                    {rule.source.title}
                  </a>
                  {rule.source_detail ? (
                    <p className="mt-1 text-sm text-muted-foreground">{rule.source_detail}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6">Não há regras publicadas para este mês.</p>
          )}
        </section>
      ) : null}
    </AppPage>
  );
}

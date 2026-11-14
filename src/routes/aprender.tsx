import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import { AppPage } from "@/components/cereja-shell";
import { Button } from "@/components/ui/button";
import { FLASHCARDS } from "@/demo/cereja-demo";

export const Route = createFileRoute("/aprender")({
  head: () => ({
    meta: [
      { title: "Aprender · Cerejá" },
      {
        name: "description",
        content: "Flashcards simples sobre solo, água, café, entrelinhas e cuidados.",
      },
    ],
  }),
  component: LearnPage,
});

const categories = ["Todos", "Solo", "Água", "Satélite", "Café", "Entrelinhas"] as const;

function LearnPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>("Todos");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = useMemo(
    () =>
      category === "Todos"
        ? [...FLASHCARDS]
        : FLASHCARDS.filter((card) => card.category === category),
    [category],
  );
  const card = cards[index] ?? cards[0];
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [category]);
  const move = (direction: number) => {
    setIndex((current) => (current + direction + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <AppPage>
      <header className="border-b border-border pb-7">
        <p className="eyebrow">Solo sem mistério</p>
        <h1 className="display-soft mt-3 text-5xl sm:text-7xl">Entenda o que a terra mostra.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Solo, água e satélite explicados com perguntas curtas e respostas diretas.
        </p>
      </header>
      <section className="py-8" aria-label="Categorias">
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
          {categories.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === item}
              key={item}
              onClick={() => setCategory(item)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${category === item ? "border-leaf bg-leaf text-leaf-foreground" : "border-border bg-paper"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      {card && (
        <section className="mx-auto max-w-3xl pb-10" aria-live="polite">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              {index + 1} de {cards.length}
            </span>
            <span className="text-sm font-semibold text-cherry">{card.category}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-cherry transition-[width]"
              style={{ width: `${((index + 1) / cards.length) * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className={`flashcard mt-6 ${flipped ? "flashcard-flipped" : ""}`}
            aria-label={flipped ? "Mostrar pergunta" : "Mostrar resposta"}
          >
            <span className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">
              {flipped ? "Resposta" : "Pergunta"}
            </span>
            <strong className="mt-6 block max-w-[20ch] text-3xl leading-tight sm:text-5xl">
              {flipped ? card.answer : card.question}
            </strong>
            <span className="mt-10 inline-flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="size-4" />
              {flipped ? "Voltar à pergunta" : "Virar cartão"}
            </span>
          </button>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => move(-1)}
              className="min-h-12 justify-self-start rounded-full border border-border px-5"
            >
              <ArrowLeft />
              Anterior
            </Button>
            <span className="grid size-10 place-items-center rounded-full bg-card">
              <BookOpen className="size-4" />
            </span>
            <Button
              variant="ghost"
              onClick={() => move(1)}
              className="min-h-12 justify-self-end rounded-full border border-border px-5"
            >
              Próximo
              <ArrowRight />
            </Button>
          </div>
          <article className="mt-8 rounded-2xl border border-border bg-paper p-5">
            <p className="eyebrow">Glossário</p>
            <h2 className="mt-2 text-xl font-semibold">{card.term}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{card.definition}</p>
          </article>
        </section>
      )}
    </AppPage>
  );
}

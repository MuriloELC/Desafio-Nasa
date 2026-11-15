import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppPage } from "@/components/cereja-shell";
import { calendar, type Assessment, type Calendar, type FieldInput } from "@/lib/cereja-api";
import { farmConfig, savedAssessment, useFarm, type FarmSnapshot } from "@/lib/farm-client";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import { isStoredAnswers } from "@/lib/onboarding";

export const Route = createFileRoute("/lavoura")({
  head: () => ({
    meta: [
      { title: "Minha Lavoura · Cerejá" },
      { name: "description", content: "Caderno privado de talhões, ciclos, tarefas e avaliações." },
    ],
  }),
  component: FarmPage,
});

const input = "mt-1 block w-full rounded-xl border border-border bg-paper p-3";
const button =
  "rounded-full bg-cherry px-5 py-3 font-bold text-primary-foreground disabled:opacity-50";
const card = "rounded-2xl border border-border bg-paper p-5";
const empty: FarmSnapshot = { plots: [], cycles: [], tasks: [], assessments: [] };

function todayInRondonia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Porto_Velho",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)?.value ?? "")
    .join("-");
}

function initialPoint() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ANSWERS_STORAGE_KEY) ?? "null")?.answers;
    if (isStoredAnswers(value) && value.latitude !== null && value.longitude !== null) {
      return { lat: value.latitude, lon: value.longitude };
    }
  } catch {
    /* o talhão pode ser informado manualmente */
  }
  return { lat: "", lon: "" };
}

function optionalNumber(data: FormData, key: string) {
  const value = data.get(key);
  return value === null || value === "" ? null : Number(value);
}

function optionalBoolean(data: FormData, key: string) {
  const value = data.get(key);
  return value === "" || value === null ? null : value === "true";
}

function fieldFromForm(data: FormData): FieldInput {
  return {
    phase: (data.get("phase") || null) as FieldInput["phase"],
    water: (data.get("water") || null) as FieldInput["water"],
    age_years: optionalNumber(data, "age_years"),
    spacing_m: optionalNumber(data, "spacing_m"),
    soil_ph: optionalNumber(data, "soil_ph"),
    nematodes: optionalBoolean(data, "nematodes"),
    can_manage: optionalBoolean(data, "can_manage"),
    soil_assessed: optionalBoolean(data, "soil_assessed"),
    moisture_checked: optionalBoolean(data, "moisture_checked"),
  };
}

export function FarmPage() {
  const { sessionVersion } = useFarm();
  return <FarmPageSession key={sessionVersion} />;
}

function FarmPageSession() {
  const { signedIn, signIn, signOut, request } = useFarm();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<FarmSnapshot>(empty);
  const [reference, setReference] = useState<Calendar | null>(null);
  const [selectedPlot, setSelectedPlot] = useState("");
  const [selectedCulture, setSelectedCulture] = useState("");
  const [selectedTaskPlot, setSelectedTaskPlot] = useState("");
  const [saved, setSaved] = useState<Assessment | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [point, setPoint] = useState<{ lat: number | string; lon: number | string }>({
    lat: "",
    lon: "",
  });
  const today = todayInRondonia();

  useEffect(() => {
    setPoint(initialPoint());
    farmConfig()
      .then((config) => setEnabled(config.minha_lavoura))
      .catch((error: unknown) => {
        setEnabled(false);
        setNotice(error instanceof Error ? error.message : "Configuração indisponível.");
      });
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setSnapshot(empty);
      setSaved(null);
      return;
    }
    let active = true;
    request<FarmSnapshot>("")
      .then((farm) => {
        if (active) setSnapshot(farm);
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Caderno indisponível.");
      });
    calendar()
      .then((catalog) => {
        if (active) setReference(catalog);
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Catálogo indisponível.");
      });
    return () => {
      active = false;
    };
  }, [signedIn, request]);

  async function perform(action: () => Promise<unknown>, form?: HTMLFormElement) {
    setBusy(true);
    setNotice("");
    try {
      await action();
      form?.reset();
      setSnapshot(await request<FarmSnapshot>(""));
      setNotice("Registro atualizado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    setBusy(true);
    setNotice("");
    try {
      const logged = await signIn(
        String(data.get("email")),
        String(data.get("password")),
        action?.value === "signup",
      );
      form.reset();
      setNotice(
        logged
          ? "Sessão ativa. Os registros são privados."
          : "Confirme o cadastro por e-mail e depois entre.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Autenticação indisponível.");
    } finally {
      setBusy(false);
    }
  }

  const plotName = (id: string) => snapshot.plots.find((plot) => plot.id === id)?.name ?? "Talhão";
  const cultureName = (id: string) =>
    reference?.cultures.find((culture) => culture.culture_id === id)?.name ?? id;
  const parentCycles = snapshot.cycles.filter(
    (cycle) => cycle.plot_id === selectedPlot && cycle.kind === "cafe" && !cycle.ended_on,
  );
  const taskCycles = snapshot.cycles.filter(
    (cycle) => cycle.plot_id === selectedTaskPlot && !cycle.ended_on,
  );
  const chosenKind = reference?.cultures.find(
    (culture) => culture.culture_id === selectedCulture,
  )?.kind;

  return (
    <AppPage>
      <header className="border-b border-border pb-8">
        <p className="eyebrow">Caderno de campo privado</p>
        <h1 className="display-soft mt-3 text-5xl sm:text-7xl">Minha Lavoura</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Cadastre talhões, acompanhe ciclos e tarefas e salve avaliações quando decidir. Cada
          registro fica vinculado à sua conta.
        </p>
        {signedIn ? (
          <button
            type="button"
            className="mt-5 rounded-full border border-border px-5 py-3"
            onClick={() =>
              void signOut().then(() => setNotice("Sessão encerrada neste navegador."))
            }
          >
            Sair da conta
          </button>
        ) : null}
      </header>
      {notice ? (
        <p role="status" className="my-5 rounded-xl bg-card p-4">
          {notice}
        </p>
      ) : null}
      {enabled === null ? <p className="py-6">Verificando disponibilidade do caderno…</p> : null}
      {enabled === false ? (
        <p className="py-6">O caderno de campo ainda não foi habilitado neste ambiente.</p>
      ) : null}
      {enabled && !signedIn ? (
        <section className="max-w-xl py-8">
          <h2 className="text-2xl font-semibold">Acessar caderno</h2>
          <form onSubmit={(event) => void authenticate(event)} className="mt-5 space-y-4">
            <label className="block font-semibold">
              E-mail
              <input name="email" type="email" required autoComplete="email" className={input} />
            </label>
            <label className="block font-semibold">
              Senha
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                minLength={6}
                className={input}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" value="login" disabled={busy} className={button}>
                Entrar
              </button>
              <button
                type="submit"
                value="signup"
                disabled={busy}
                className="rounded-full border border-border px-5 py-3 font-bold"
              >
                Criar conta
              </button>
            </div>
          </form>
        </section>
      ) : null}
      {signedIn ? (
        <div className="space-y-10 py-8">
          <section>
            <h2 className="display-soft text-4xl">Talhões</h2>
            <p className="mt-2 text-muted-foreground">
              Use um ponto dentro do círculo piloto de 20 km de Cacoal.{" "}
              <Link to="/chat" className="text-cherry underline">
                Marcar ponto na conversa
              </Link>
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void perform(
                  () =>
                    request("/talhoes", "POST", {
                      name: data.get("name"),
                      lat: Number(data.get("lat")),
                      lon: Number(data.get("lon")),
                    }),
                  form,
                );
              }}
              className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
            >
              <label className="font-semibold">
                Nome
                <input name="name" required maxLength={100} className={input} />
              </label>
              <label className="font-semibold">
                Latitude
                <input
                  name="lat"
                  type="number"
                  required
                  step="any"
                  min="-90"
                  max="90"
                  defaultValue={point.lat}
                  className={input}
                />
              </label>
              <label className="font-semibold">
                Longitude
                <input
                  name="lon"
                  type="number"
                  required
                  step="any"
                  min="-180"
                  max="180"
                  defaultValue={point.lon}
                  className={input}
                />
              </label>
              <button disabled={busy} className={button}>
                Cadastrar
              </button>
            </form>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {snapshot.plots.map((plot) => (
                <article key={plot.id} className={card}>
                  <h3 className="font-bold">{plot.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plot.lat}, {plot.lon}
                  </p>
                </article>
              ))}
            </div>
            {!snapshot.plots.length ? <p className="mt-4">Nenhum talhão cadastrado.</p> : null}
          </section>
          <section>
            <h2 className="display-soft text-4xl">Ciclos de cultivo</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void perform(
                  () =>
                    request("/ciclos", "POST", {
                      plot_id: data.get("plot_id"),
                      culture_id: data.get("culture_id"),
                      parent_id: data.get("parent_id") || undefined,
                      planted_on: data.get("planted_on"),
                    }),
                  form,
                );
              }}
              className="mt-4 grid gap-3 md:grid-cols-4 md:items-end"
            >
              <label className="font-semibold">
                Talhão
                <select
                  name="plot_id"
                  required
                  className={input}
                  value={selectedPlot}
                  onChange={(event) => setSelectedPlot(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {snapshot.plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Cultura
                <select
                  name="culture_id"
                  required
                  className={input}
                  value={selectedCulture}
                  onChange={(event) => setSelectedCulture(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {reference?.cultures.map((culture) => (
                    <option key={culture.culture_id} value={culture.culture_id}>
                      {culture.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Ciclo de café relacionado
                <select name="parent_id" className={input} disabled={chosenKind !== "entrelinha"}>
                  <option value="">Sem vínculo</option>
                  {parentCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cultureName(cycle.culture_id)} · {cycle.planted_on}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Plantio
                <input name="planted_on" type="date" required max={today} className={input} />
              </label>
              <button disabled={busy || !reference} className={button}>
                Registrar ciclo
              </button>
            </form>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {snapshot.cycles.map((cycle) => (
                <article key={cycle.id} className={card}>
                  <h3 className="font-bold">{cultureName(cycle.culture_id)}</h3>
                  <p className="text-sm">
                    {plotName(cycle.plot_id)} · plantio {cycle.planted_on} ·{" "}
                    {cycle.ended_on ? `encerrado ${cycle.ended_on}` : "em andamento"}
                  </p>
                  {cycle.parent_id ? (
                    <p className="text-sm">
                      Vinculado ao ciclo de café{" "}
                      {cultureName(
                        snapshot.cycles.find((item) => item.id === cycle.parent_id)?.culture_id ??
                          "",
                      )}
                    </p>
                  ) : null}
                  {!cycle.ended_on ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const data = new FormData(form);
                        void perform(
                          () =>
                            request(`/ciclos/${cycle.id}`, "PATCH", {
                              ended_on: data.get("ended_on"),
                            }),
                          form,
                        );
                      }}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <label className="text-sm">
                        Encerrar em
                        <input type="date" name="ended_on" required max={today} className={input} />
                      </label>
                      <button
                        disabled={busy}
                        className="rounded-full border border-border px-4 py-2"
                      >
                        Encerrar
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
            {!snapshot.cycles.length ? <p className="mt-4">Nenhum ciclo registrado.</p> : null}
          </section>
          <section>
            <h2 className="display-soft text-4xl">Tarefas de manejo</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void perform(
                  () =>
                    request("/tarefas", "POST", {
                      plot_id: data.get("plot_id"),
                      cycle_id: data.get("cycle_id") || undefined,
                      title: data.get("title"),
                      planned_on: data.get("planned_on"),
                    }),
                  form,
                );
              }}
              className="mt-4 grid gap-3 md:grid-cols-4 md:items-end"
            >
              <label className="font-semibold">
                Talhão
                <select
                  name="plot_id"
                  required
                  className={input}
                  value={selectedTaskPlot}
                  onChange={(event) => setSelectedTaskPlot(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {snapshot.plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Ciclo
                <select name="cycle_id" className={input}>
                  <option value="">Sem vínculo</option>
                  {taskCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cultureName(cycle.culture_id)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Tarefa
                <input name="title" required maxLength={120} className={input} />
              </label>
              <label className="font-semibold">
                Data prevista
                <input name="planned_on" type="date" required className={input} />
              </label>
              <button disabled={busy} className={button}>
                Planejar
              </button>
            </form>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {snapshot.tasks.map((task) => (
                <article key={task.id} className={card}>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="text-sm">
                    {plotName(task.plot_id)} · {task.state} · prevista {task.planned_on}
                    {task.done_on ? ` · realizada ${task.done_on}` : ""}
                  </p>
                  {task.state === "planejada" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          const data = new FormData(form);
                          void perform(
                            () =>
                              request(`/tarefas/${task.id}`, "PATCH", {
                                state: "realizada",
                                done_on: data.get("done_on"),
                              }),
                            form,
                          );
                        }}
                        className="flex items-end gap-2"
                      >
                        <label className="text-sm">
                          Realizada em
                          <input
                            name="done_on"
                            type="date"
                            required
                            max={today}
                            defaultValue={today}
                            className={input}
                          />
                        </label>
                        <button
                          disabled={busy}
                          className="rounded-full border border-border px-4 py-2"
                        >
                          Concluir
                        </button>
                      </form>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-full border border-border px-4 py-2"
                        onClick={() =>
                          void perform(() =>
                            request(`/tarefas/${task.id}`, "PATCH", { state: "cancelada" }),
                          )
                        }
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {!snapshot.tasks.length ? <p className="mt-4">Nenhuma tarefa registrada.</p> : null}
          </section>
          <section>
            <h2 className="display-soft text-4xl">Avaliações salvas</h2>
            <p className="mt-2 text-muted-foreground">
              Salvar executa uma nova avaliação no ponto cadastrado; o resultado recebe data e
              versão do método.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const field = fieldFromForm(data);
                void perform(
                  () =>
                    request("/avaliacoes", "POST", {
                      plot_id: data.get("plot_id"),
                      field,
                      reference_date: data.get("reference_date"),
                    }),
                  form,
                );
              }}
              className="mt-4 grid gap-3 md:grid-cols-4 md:items-end"
            >
              <label className="font-semibold">
                Talhão
                <select name="plot_id" required className={input}>
                  <option value="">Selecione</option>
                  {snapshot.plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Fase
                <select name="phase" className={input}>
                  <option value="">Não sei</option>
                  <option value="implantacao">Implantação</option>
                  <option value="formacao">Formação</option>
                  <option value="producao">Produção</option>
                  <option value="recepa">Recepa</option>
                </select>
              </label>
              <label className="font-semibold">
                Regime hídrico
                <select name="water" className={input}>
                  <option value="">Não sei</option>
                  <option value="sequeiro">Sequeiro</option>
                  <option value="irrigado">Irrigado</option>
                </select>
              </label>
              <label className="font-semibold">
                pH da análise local
                <input name="soil_ph" type="number" min="0" max="14" step="0.1" className={input} />
              </label>
              <label className="font-semibold">
                Idade do café (anos)
                <input
                  name="age_years"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={input}
                />
              </label>
              <label className="font-semibold">
                Espaçamento entre linhas (m)
                <input
                  name="spacing_m"
                  type="number"
                  min="0.01"
                  max="30"
                  step="0.01"
                  className={input}
                />
              </label>
              {(
                [
                  ["nematodes", "Histórico de nematoides"],
                  ["can_manage", "Consegue manejar a cobertura"],
                  ["soil_assessed", "Fertilidade avaliada no talhão"],
                  ["moisture_checked", "Umidade verificada em campo"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="font-semibold">
                  {label}
                  <select name={key} className={input}>
                    <option value="">Não sei</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </label>
              ))}
              <label className="font-semibold">
                Data de referência
                <input
                  name="reference_date"
                  type="date"
                  required
                  max={today}
                  defaultValue={today}
                  className={input}
                />
              </label>
              <button disabled={busy} className={button}>
                Executar e salvar
              </button>
            </form>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {snapshot.assessments.map((record) => (
                <article key={record.id} className={card}>
                  <p className="font-bold">
                    {plotName(record.plot_id)} · {record.reference_date}
                  </p>
                  <p className="text-sm text-muted-foreground">Método {record.method_version}</p>
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-3 text-cherry underline"
                    onClick={() => {
                      setBusy(true);
                      void savedAssessment(request, record.id)
                        .then(setSaved)
                        .catch((error: unknown) =>
                          setNotice(
                            error instanceof Error ? error.message : "Avaliação indisponível.",
                          ),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Abrir avaliação
                  </button>
                </article>
              ))}
            </div>
            {!snapshot.assessments.length ? <p className="mt-4">Nenhuma avaliação salva.</p> : null}
            {saved ? (
              <article className={`${card} mt-5`}>
                <h3 className="text-xl font-semibold">Resultado salvo · {saved.reference_date}</h3>
                <p className="text-sm">Método {saved.method_version}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {saved.candidates.map((item) => (
                    <li key={item.culture_id}>
                      <strong>
                        {item.name} · {item.state}
                      </strong>
                      : {item.reasons.join(" ")}
                      {item.missing.length ? ` Verificar: ${item.missing.join(", ")}.` : ""}
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </section>
        </div>
      ) : null}
    </AppPage>
  );
}

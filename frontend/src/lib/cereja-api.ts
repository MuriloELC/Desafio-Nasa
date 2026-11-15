export type EvidenceStatus = "observado" | "informado" | "referencia" | "indisponivel";
export type Evidence<T> = { status: EvidenceStatus; value: T | null };

export function evidence<T>(
  value: T | null | undefined,
  kind: Exclude<EvidenceStatus, "indisponivel">,
): Evidence<T> {
  return value === null || value === undefined
    ? { status: "indisponivel", value: null }
    : { status: kind, value };
}

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  observado: "Observado",
  informado: "Informado pelo produtor",
  referencia: "Referência técnica",
  indisponivel: "Indisponível",
};

export type Observation = {
  source_id: string;
  product: string;
  native_resolution: string;
  url: string;
  metric: string;
  value: number;
  unit: string;
  observed_on?: string;
  quality: string;
  depth_top_cm?: number;
  depth_bottom_cm?: number;
};

export type Diagnosis = {
  latitude: number;
  longitude: number;
  inside: boolean;
  cell_id: string | null;
  cell_grid_km: number;
  municipality: string | null;
  daily: Observation[];
  static: Observation[];
  missing: string[];
};

export type Coverage = {
  source_id: string;
  metric: string;
  product: string;
  native_resolution: string;
  url: string;
  start_on: string;
  end_on: string;
  days_available: number;
  days_expected: number;
  value: number | null;
};

export type Candidate = {
  culture_id: string;
  name: string;
  state: "favoravel" | "atencao" | "sem_dados" | "desfavoravel";
  missing: string[];
  reasons: string[];
  sources: Array<{
    title: string;
    url: string;
    detail?: string;
    rule_version?: number;
    requirement_version?: number;
  }>;
};

export type Assessment = {
  inside: boolean;
  message?: string;
  cell_id?: string;
  municipality?: string | null;
  reference_date?: string;
  method_version?: string;
  measurements?: Record<string, { value: number; source_id: string; period_count: number }>;
  coverage?: Coverage[];
  candidates: Candidate[];
};

export type CalendarRule = {
  rule_id: string;
  version: number;
  culture_id: string;
  activity: string;
  kind: string;
  phase: string;
  water: string;
  uf: string | null;
  municipality: string | null;
  months: number[];
  starts_on: string | null;
  ends_on: string | null;
  orientation: string;
  source: { title: string; url: string };
  source_detail: string;
};

export type Calendar = {
  year: number;
  months: number[];
  today_month: number | null;
  cultures: Array<{ culture_id: string; name: string; kind: string }>;
  rules: CalendarRule[];
};

export type FieldInput = {
  phase: "implantacao" | "formacao" | "producao" | "recepa" | null;
  water: "sequeiro" | "irrigado" | null;
  age_years: number | null;
  spacing_m: number | null;
  soil_ph: number | null;
  nematodes: boolean | null;
  can_manage: boolean | null;
  soil_assessed: boolean | null;
  moisture_checked: boolean | null;
};

export type AssessmentRequest = { lat: number; lon: number; field: FieldInput };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("A API está indisponível. Verifique a conexão e tente novamente.", 0);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "O serviço não respondeu. Tente novamente.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export function diagnosis(lat: number, lon: number, signal?: AbortSignal) {
  return api<Diagnosis>(
    `/api/consulta?${new URLSearchParams({ lat: String(lat), lon: String(lon), raio: "20" })}`,
    { signal: signal ?? null },
  );
}

export function assessment(payload: AssessmentRequest, signal?: AbortSignal) {
  return api<Assessment>("/api/recomendacoes", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: signal ?? null,
  });
}

export function calendar(municipality?: string | null, signal?: AbortSignal) {
  const query = municipality ? `?${new URLSearchParams({ municipio: municipality })}` : "";
  return api<Calendar>(`/api/calendario${query}`, { signal: signal ?? null });
}

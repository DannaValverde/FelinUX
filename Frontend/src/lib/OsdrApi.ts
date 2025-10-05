// src/lib/OsdrApi.ts
// Cliente minimalista para la NASA OSDR RAG API (FastAPI)

export type QueryRequest = {
  query: string;
  top_k?: number;                              // default 5
  filters?: Record<string, unknown> | null;    // e.g. { program: "Apollo", year: ["2020","2021"] }
};

export type RebuildRequest = {
  limit?: number;           // default 1000 (backend)
  include_csv?: boolean;    // default true
};



export type PaperMeta = {
  origin: "csv" | "osdr" | string;
  id?: string;              // en meta viene id redundante en algunos casos
  title?: string;
  authors?: string;
  program?: string;
  date?: string;
  year?: string;
  link?: string;
  journal?: string;
  abstract?: string;
  [k: string]: unknown;
};

export type PaperItem = {
  id: string;
  meta: PaperMeta;
  text_preview?: string;
  score?: number;
};

export type PapersResponse = {
  papers: PaperItem[];
  total?: number;
};

export type PaperResponse = PaperItem;

export type QueryResponse = {
  summary: string;
  papers: PaperItem[];       // <-- antes “results”
  total_found: number;
};

export type RebuildResponse = {
  status: string;            // "ok"
  indexed: number;
  message?: string;
};

export type StatsResponse = {
  total_papers: number;
  programs: string[];
  years: string[];
};

export type ClientOptions = {
  baseUrl?: string;                    // p.ej. "http://localhost:8000"
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export class OsdrApiError extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "OsdrApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

async function doFetchJSON<T>(
  url: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<T> {
  const controller = new AbortController();
  const timer =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new OsdrApiError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
        json ?? text
      );
    }
    return json as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new OsdrApiError("Request timeout/cancelled");
    }
    if (err instanceof SyntaxError) {
      throw new OsdrApiError("Invalid JSON in response");
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createOsdrApi(options: ClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "http://localhost:8000").replace(/\/+$/, "");
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  const timeoutMs = options.timeoutMs ?? 30000;

  return {
    get base() {
      return baseUrl;
    },

    // POST /rebuild_index
    async rebuildIndex(body: RebuildRequest = {}): Promise<RebuildResponse> {
      const url = buildUrl(baseUrl, "/rebuild_index");
      return doFetchJSON<RebuildResponse>(
        url,
        { method: "POST", headers: defaultHeaders, body: JSON.stringify(body) },
        timeoutMs
      );
    },

    // GET /papers?limit=&program=&year=
    async listPapers(params?: { limit?: number; program?: string; year?: string }): Promise<PapersResponse> {
      const q = new URLSearchParams();
      if (params?.limit != null) q.set("limit", String(params.limit));
      if (params?.program) q.set("program", params.program);
      if (params?.year) q.set("year", params.year);
      const qs = q.toString() ? `?${q.toString()}` : "";
      const url = buildUrl(baseUrl, `/papers${qs}`);
      return doFetchJSON<PapersResponse>(
        url,
        { method: "GET", headers: defaultHeaders },
        timeoutMs
      );
    },

    // GET /paper/{paper_id}
    async getPaper(paperId: string): Promise<PaperResponse> {
      if (!paperId) throw new OsdrApiError("paperId is required");
      const url = buildUrl(baseUrl, `/paper/${encodeURIComponent(paperId)}`);
      return doFetchJSON<PaperResponse>(
        url,
        { method: "GET", headers: defaultHeaders },
        timeoutMs
      );
    },

    // GET /stats
    async stats(): Promise<StatsResponse> {
      const url = buildUrl(baseUrl, "/stats");
      return doFetchJSON<StatsResponse>(
        url,
        { method: "GET", headers: defaultHeaders },
        timeoutMs
      );
    },

    // POST /query
    async query(payload: QueryRequest): Promise<QueryResponse> {
      if (!payload?.query?.trim()) throw new OsdrApiError("query is required");
      const url = buildUrl(baseUrl, "/query");
      return doFetchJSON<QueryResponse>(
        url,
        {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify({
            query: payload.query,
            top_k: payload.top_k ?? 5,
            ...(payload.filters != null ? { filters: payload.filters } : {}),
          }),
        },
        timeoutMs
      );
    },
  };
}

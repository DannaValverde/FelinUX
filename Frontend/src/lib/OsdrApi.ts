// src/lib/OsdrApi.ts
// Cliente minimalista para la NASA OSDR RAG API (FastAPI)
// - Sin componentes ni hooks: solo funciones que devuelven JSON tipado
// - Manejo de timeout/cancelación con AbortController
// - Tipos estrictos (puedes extenderlos si tu backend agrega campos)

export type QueryRequest = {
  query: string;
  top_k?: number;                // por defecto 5 en el backend
  filters?: Record<string, unknown> | null;
};

export type RebuildRequest = {
  limit?: number;                // por defecto 608
  include_api?: boolean;         // por defecto true
  include_csv?: boolean;         // por defecto true
};

export type PaperMeta = {
  origin: "osdr" | "csv";
  osd_numeric_id?: number;
  title_pre?: string;
  title?: string;
  related_osdr?: string[];
  related_csv?: string[];
  files?: Array<{ name: string; url: string }>;
  // Acepta llaves adicionales del backend:
  [k: string]: unknown;
};

export type PaperItem = {
  id: string;
  text_preview?: string;
  meta: PaperMeta;
};

export type PapersResponse = {
  papers: PaperItem[];
};

export type PaperResponse = PaperItem;

export type QueryResultItem = {
  id: string;
  meta: PaperMeta;
  text_preview: string;
};

export type QueryResponse = {
  summary: string;
  results: QueryResultItem[];
};

export type RebuildResponse = {
  status: string;   // "ok"
  indexed: number;
};

export type ClientOptions = {
  baseUrl?: string;                    // p.ej. "http://localhost:8000"
  headers?: Record<string, string>;    // encabezados extra
  timeoutMs?: number;                  // timeout para cada request
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
    const text = await res.text(); // capturamos el texto para mejores errores
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
      throw new OsdrApiError("Request timeout/cancelled", undefined);
    }
    // Si el backend devolvió texto no JSON, atrapamos parse fallido:
    if (err instanceof SyntaxError) {
      throw new OsdrApiError("Invalid JSON in response", undefined);
    }
    // Propagamos errores de red u OsdrApiError
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
    /** Devuelve la base configurada (por si quieres mostrarla en logs/diagnóstico) */
    get base() {
      return baseUrl;
    },

    /** POST /rebuild_index */
    async rebuildIndex(body: RebuildRequest): Promise<RebuildResponse> {
      const url = buildUrl(baseUrl, "/rebuild_index");
      return doFetchJSON<RebuildResponse>(
        url,
        {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify(body ?? {}),
        },
        timeoutMs
      );
    },

    /** GET /papers?limit= */
    async listPapers(limit = 200): Promise<PapersResponse> {
      const url = buildUrl(baseUrl, `/papers?limit=${encodeURIComponent(limit)}`);
      return doFetchJSON<PapersResponse>(
        url,
        { method: "GET", headers: defaultHeaders },
        timeoutMs
      );
    },

    /** GET /paper/{paper_id} */
    async getPaper(paperId: string): Promise<PaperResponse> {
      if (!paperId) {
        throw new OsdrApiError("paperId is required");
      }
      const url = buildUrl(baseUrl, `/paper/${encodeURIComponent(paperId)}`);
      return doFetchJSON<PaperResponse>(
        url,
        { method: "GET", headers: defaultHeaders },
        timeoutMs
      );
    },

    /** POST /query */
    async query(payload: QueryRequest): Promise<QueryResponse> {
      if (!payload?.query?.trim()) {
        throw new OsdrApiError("query is required");
      }
      const url = buildUrl(baseUrl, "/query");
      return doFetchJSON<QueryResponse>(
        url,
        {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify({
            query: payload.query,
            top_k: payload.top_k ?? 5,
            // si viene null/undefined lo omitimos para no chocar con pydantic
            ...(payload.filters != null ? { filters: payload.filters } : {}),
          }),
        },
        timeoutMs
      );
    },
  };
}

// Utilidad opcional: helper de timeout externo (por si quieres ajustar por llamada)
// Ejemplo: await withTimeout(api.query({query:"..." }), 10000)
export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    // Nota: esto solo cancela si pasas el signal a fetch;
    // aquí es más útil para envolver otras promesas propias.
    return await p;
  } finally {
    clearTimeout(timeout);
  }
}

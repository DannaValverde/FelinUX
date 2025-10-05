// src/App.tsx
import { useMemo, useState } from "react";
import {
  FiSearch,
  FiRotateCcw,
  FiSliders,
  FiChevronDown,
  FiInfo,
} from "react-icons/fi";
import { createOsdrApi, type QueryResponse, type PaperMeta } from "./lib/OsdrApi";

function titleFromMeta(meta: PaperMeta) {
  return (meta.title ?? meta.title_pre ?? "(untitled)") as string;
}
function originBadge(origin?: string) {
  if (origin === "osdr") return "OSDR";
  if (origin === "csv") return "CSV";
  return "Unknown";
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<QueryResponse | null>(null);

  // 👇 Estados SOLO de UI para el panel de filtros (sin funcionalidad de IA)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [organism, setOrganism] = useState("");
  const [accession, setAccession] = useState("");
  const [fileType, setFileType] = useState("");
  const [assay, setAssay] = useState("");
  const [factors, setFactors] = useState("");
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  const api = useMemo(
    () =>
      createOsdrApi({
        baseUrl: import.meta.env.VITE_OSDR_API_BASE ?? "http://localhost:8000",
        timeoutMs: 30000,
      }),
    []
  );

  const onSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setData(null);
    try {
      const res = await api.query({ query, top_k: 8 });
      setData(res);
    } catch (err: any) {
      const msg =
        err?.message ??
        (typeof err === "string" ? err : "Unexpected error performing query");
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuery("");
    setData(null);
    setErrorMsg(null);
    setLoading(false);
  };

  // 👉 Botón “Advanced Search” (solo UI por ahora)
  const onAdvancedSearchClick = () => {
    console.log("Advanced search (UI only):", {
      organism,
      accession,
      fileType,
      assay,
      factors,
    });
  };

  const clearAdvanced = () => {
    setOrganism("");
    setAccession("");
    setFileType("");
    setAssay("");
    setFactors("");
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-extrabold tracking-tight">7to9</h1>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">
            Space Biology Knowledge Engine
          </h2>
          <p className="opacity-70 mt-2">NASA Space Apps Challenge 2025 — FelinUX</p>
        </header>

        {/* Search Bar */}
        <form onSubmit={onSearch} className="flex w-full items-center gap-3 mb-3">
          <input
            type="text"
            className="input input-bordered w-full h-14 rounded-full text-lg px-6"
            placeholder="Ask about space biology research…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            aria-label="Search query"
          />
          <button
            type="submit"
            className={`btn btn-primary rounded-full h-14 w-14 p-0 ${
              loading ? "btn-disabled" : ""
            }`}
            aria-label="Search"
            disabled={loading}
            title="Search"
          >
            <FiSearch className="text-2xl" />
          </button>

          {/* 🔘 Toggle para mostrar/ocultar panel de filtros físicos */}
          <button
            type="button"
            className="btn btn-ghost rounded-full h-14 w-14 p-0"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-panel"
            title="Toggle advanced filters"
          >
            <FiSliders className="text-2xl" />
          </button>

          {data || errorMsg ? (
            <button
              type="button"
              className="btn btn-ghost rounded-full h-14 w-14 p-0"
              onClick={reset}
              title="Reset"
            >
              <FiRotateCcw className="text-2xl" />
            </button>
          ) : null}
        </form>

        {/* Panel de filtros FÍSICO (no modal) */}
        {showAdvanced && (
          <section
            id="advanced-panel"
            className="mb-6 card bg-base-100 border border-base-300"
          >
            <div className="card-body">
              <h3 className="card-title text-xl mb-2">
                What are you looking for today?
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Organism */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      Organism <FiInfo className="opacity-60" />
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered rounded-full"
                    placeholder="e.g., Mouse"
                    value={organism}
                    onChange={(e) => setOrganism(e.target.value)}
                  />
                </div>

                {/* Accession */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      Accession <FiInfo className="opacity-60" />
                    </span>
                  </label>
                  <label className="input input-bordered rounded-full flex items-center gap-2">
                    <span className="opacity-70">OSD-</span>
                    <input
                      type="text"
                      className="grow"
                      placeholder="001A"
                      value={accession}
                      onChange={(e) => setAccession(e.target.value)}
                    />
                  </label>
                </div>

                {/* Assay (fila completa en md:col-span-2 para aire) */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      Assay <FiInfo className="opacity-60" />
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered rounded-full"
                    placeholder="e.g., RNA-Seq"
                    value={assay}
                    onChange={(e) => setAssay(e.target.value)}
                  />
                </div>

                {/* Factors */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      Factors <FiInfo className="opacity-60" />
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered rounded-full"
                    placeholder="e.g., Microgravity"
                    value={factors}
                    onChange={(e) => setFactors(e.target.value)}
                  />
                </div>
              </div>

              {/* Acciones del panel (solo UI) */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary rounded-full"
                  onClick={onAdvancedSearchClick}
                >
                  Advanced Search
                </button>
                <button
                  type="button"
                  className="btn btn-ghost rounded-full"
                  onClick={clearAdvanced}
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Estados */}
        {loading && (
          <div className="w-full flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {errorMsg && !loading && (
          <div className="alert alert-error mb-6">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resultados */}
        {data && !loading && (
          <section className="space-y-6">
            {data.summary && (
              <article className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h3 className="card-title">AI Summary</h3>
                  <p className="whitespace-pre-wrap">{data.summary}</p>
                </div>
              </article>
            )}

            <div className="grid gap-4">
              {data.results.map((item) => (
                <div key={item.id} className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="badge badge-ghost">
                        {originBadge(item.meta.origin)}
                      </div>
                      {typeof item.meta.osd_numeric_id === "number" && (
                        <div className="badge badge-outline">
                          OSD-{String(item.meta.osd_numeric_id).padStart(3, "0")}
                        </div>
                      )}
                    </div>

                    <h4 className="card-title">{titleFromMeta(item.meta)}</h4>

                    {item.text_preview && (
                      <p className="opacity-80">{item.text_preview}</p>
                    )}

                    {(item.meta.related_osdr?.length ||
                      item.meta.related_csv?.length) && (
                      <div className="text-sm opacity-70 flex flex-wrap gap-2">
                        {item.meta.related_osdr?.length ? (
                          <span>Related OSDR: {item.meta.related_osdr.join(", ")}</span>
                        ) : null}
                        {item.meta.related_csv?.length ? (
                          <span>Related CSV: {item.meta.related_csv.join(", ")}</span>
                        ) : null}
                      </div>
                    )}

                    {item.meta.files?.length ? (
                      <div className="card-actions justify-end pt-2">
                        {item.meta.files.map((f, idx) => (
                          <a
                            key={idx}
                            className="btn btn-outline btn-sm"
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {f.name || "Download"}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && !data && !errorMsg && (
          <p className="text-center opacity-70">
            Aks any question and click the search button
          </p>
        )}
      </div>
    </div>
  );
}

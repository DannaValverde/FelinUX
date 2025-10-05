// src/App.tsx
import { useMemo, useState } from "react";
import { FiSearch, FiRotateCcw } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { createOsdrApi, type QueryResponse, type PaperMeta } from "./lib/OsdrApi";

function titleFromMeta(meta: PaperMeta) {
  return (meta.title ?? "(untitled)") as string;
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

  const hasResults = !!data && data.papers.length > 0;

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
      const res = await api.query({ query, top_k: 12 });
      setData(res);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Unexpected error performing query");
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

  // Variants para animaciones
  const searchWrapVariants = {
    initial: { opacity: 1, y: 0, scale: 1 },
    compact: { opacity: 1, y: -12, scale: 0.96 },
    expanded: { opacity: 1, y: 0, scale: 1 },
  };

  const listVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.05, when: "beforeChildren" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 22 } },
    exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } },
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        {/* Header + Search (animable) */}
        <motion.header
          className={`text-center ${hasResults ? "mb-4" : "mb-8"}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.h1
            className="font-extrabold tracking-tight"
            initial={{ scale: 1 }}
            animate={{ scale: hasResults ? 0.92 : 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            style={{ fontSize: hasResults ? "2.75rem" : "3rem", lineHeight: 1.1 }}
          >
            729
          </motion.h1>
          <motion.h2
            className="font-bold mt-2"
            initial={{ opacity: 1 }}
            animate={{ opacity: hasResults ? 0.9 : 1 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: hasResults ? "1.6rem" : "2rem" }}
          >
            Space Biology Knowledge Engine
          </motion.h2>
          <motion.p
            className="opacity-70 mt-2"
            initial={{ opacity: 1 }}
            animate={{ opacity: hasResults ? 0.6 : 0.7 }}
          >
            NASA Space Apps Challenge 2025 — FelinUX
          </motion.p>
        </motion.header>

        <motion.div
          variants={searchWrapVariants}
          initial="initial"
          animate={hasResults ? "compact" : "expanded"}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          className={`${hasResults ? "mb-4" : "mb-6"}`}
        >
          <form onSubmit={onSearch} className="flex w-full items-center gap-3">
            <input
              type="text"
              className={`input input-bordered w-full rounded-full text-lg px-6 transition-all duration-200 ${
                hasResults ? "h-12" : "h-14"
              }`}
              placeholder="Ask about space biology research…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              aria-label="Search query"
            />
            <button
              type="submit"
              className={`btn btn-primary rounded-full p-0 transition-all duration-200 ${
                hasResults ? "h-12 w-12" : "h-14 w-14"
              } ${loading ? "btn-disabled" : ""}`}
              aria-label="Search"
              disabled={loading}
              title="Search"
            >
              <FiSearch className={`${hasResults ? "text-xl" : "text-2xl"}`} />
            </button>
            {(data || errorMsg) && (
              <button
                type="button"
                className={`btn btn-ghost rounded-full p-0 transition-all duration-200 ${
                  hasResults ? "h-12 w-12" : "h-14 w-14"
                }`}
                onClick={reset}
                title="Reset"
              >
                <FiRotateCcw className={`${hasResults ? "text-xl" : "text-2xl"}`} />
              </button>
            )}
          </form>
        </motion.div>

        {/* Estados */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="w-full flex justify-center"
            >
              <span className="loading loading-spinner loading-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMsg && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="alert alert-error mb-6"
            >
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultados (sin AI Summary) */}
        <AnimatePresence mode="wait">
          {hasResults && !loading && (
            <motion.section
              key="results"
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: 10 }}
              className="space-y-4"
            >
              <div className="text-sm opacity-70 mb-2">
                {data!.total_found} paper{data!.total_found === 1 ? "" : "s"} found
              </div>

              <div className="grid gap-4">
                {data!.papers.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    layout
                    className="card bg-base-100 border border-base-300 shadow-sm"
                  >
                    <div className="card-body">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="badge badge-ghost">
                          {originBadge(item.meta.origin as string)}
                        </div>
                        {item.meta.program && (
                          <div className="badge badge-outline">{item.meta.program}</div>
                        )}
                        {item.meta.year && (
                          <div className="badge badge-outline">{item.meta.year}</div>
                        )}
                        {typeof item.score === "number" && (
                          <div className="badge badge-ghost">
                            score: {item.score.toFixed(4)}
                          </div>
                        )}
                      </div>

                      <h4 className="card-title">{titleFromMeta(item.meta)}</h4>

                      {(item.meta.authors || item.meta.journal) && (
                        <div className="text-sm opacity-70">
                          {item.meta.authors ? <span>{item.meta.authors}</span> : null}
                          {item.meta.authors && item.meta.journal ? <span> • </span> : null}
                          {item.meta.journal ? <span>{item.meta.journal}</span> : null}
                        </div>
                      )}

                      {item.meta.abstract ? (
                        <p className="opacity-80 mt-2">{item.meta.abstract}</p>
                      ) : item.text_preview ? (
                        <p className="opacity-80 mt-2">{item.text_preview}</p>
                      ) : null}

                      <div className="card-actions justify-end pt-2">
                        {item.meta.link && (
                          <a
                            className="btn btn-outline btn-sm"
                            href={item.meta.link as string}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Link
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Vacío */}
        {!loading && !hasResults && !errorMsg && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-center"
          >
            Escribe una pregunta y presiona buscar.
          </motion.p>
        )}
      </div>
    </div>
  );
}

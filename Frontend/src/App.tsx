import React, { useEffect, useRef, useState } from "react";
import { FiZap, FiFilter, FiArrowLeft, FiSearch } from "react-icons/fi";

/* =============================
   🔹 Tipos
   ============================= */
type SearchMode = "ai" | "manual";

export default function App() {
  /* =============================
     🔹 Estados principales
     ============================= */
  const [query, setQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("ai");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* =============================
     🔹 Modal y dropdowns
     ============================= */
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [fileOptionsOpen, setFileOptionsOpen] = useState<boolean>(false);

  /* =============================
     🔹 Filtros
     ============================= */
  const [organism, setOrganism] = useState<string>("");
  const [accession, setAccession] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [assay, setAssay] = useState<string>("");
  const [factors, setFactors] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [mission, setMission] = useState<string>("");

  const filtersRef = useRef<HTMLDivElement | null>(null);

  const fileOptions = [
    "Study",
    "Experiment",
    "Subject",
    "Biospecimen",
    "Payload",
    "Genomic Data",
  ];

  const missionOptions = [
    "ISS",
    "Artemis",
    "Apollo",
    "Space Shuttle",
    "Commercial Crew",
    "Other",
  ];

  /* =============================
     🔹 Efectos
     ============================= */
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        showFilters &&
        filtersRef.current &&
        !filtersRef.current.contains(e.target as Node)
      ) {
        setShowFilters(false);
        setFileOptionsOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowFilters(false);
        setFileOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showFilters]);

  /* =============================
     🔹 Handlers
     ============================= */
  const handleAISearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setSearchMode("ai");
    await new Promise((r) => setTimeout(r, 1200)); // simulación
    setIsSearching(true);
    setIsLoading(false);
    console.log("AI search:", query);
  };

  const handleAdvancedSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setSearchMode("manual");
    setShowFilters(false);
    setFileOptionsOpen(false);
    await new Promise((r) => setTimeout(r, 900)); // simulación
    setIsSearching(true);
    setIsLoading(false);
    console.log("Advanced search with:", {
      query,
      organism,
      accession,
      fileType,
      assay,
      factors,
      year,
      mission,
    });
  };

  const clearFilters = () => {
    setOrganism("");
    setAccession("");
    setFileType("");
    setAssay("");
    setFactors("");
    setYear("");
    setMission("");
  };

  const resetView = () => {
    setIsSearching(false);
    setQuery("");
    setIsLoading(false);
  };

  const toggleFileType = (opt: string) => {
    setFileType((prev) => (prev === opt ? "" : opt));
  };

  const editFilter = () => {
    setShowFilters(true);
    setSearchMode("manual");
  };

  const hasActiveFilters =
    organism || accession || fileType || assay || factors || year || mission;

  /* =============================
     🔹 Render principal
     ============================= */

  const body = (
    <div className="min-h-screen bg-base-200 text-base-content">
      {/* contenedor más ancho */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-10">
        {/* Header grande */}
        <header className="text-center mb-10">
          <h1 className="text-6xl font-extrabold tracking-tight">729</h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
            Space Biology Knowledge Engine
          </h2>
          <p className="opacity-70 text-base md:text-lg mt-3">Made By FelinUX Team</p>
          <p className="opacity-70 text-base md:text-lg">NASA Space Apps Challenge 2025</p>
        </header>

        {/* Barra de búsqueda XL (casi todo el ancho) */}
        <div className="w-full mb-8">
          <div className="flex w-full items-center gap-3">
            {/* Barra de búsqueda */}
            <input
              type="text"
              className="input input-bordered w-full h-16 rounded-full text-lg px-6"
              placeholder={
                searchMode === "ai"
                  ? "Ask about space biology research in natural language..."
                  : "Search with specific criteria using the filters..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  searchMode === "ai" ? handleAISearch(e) : handleAdvancedSearch(e);
                }
              }}
              disabled={isLoading}
              aria-label="Main search input"
            />

            {/* Botón circular con la misma altura */}
            <button
              className={`btn btn-primary rounded-full flex items-center justify-center p-0 ${isLoading ? "btn-disabled" : ""
                } h-16 w-16`}
              title="Search"
              onClick={searchMode === "ai" ? handleAISearch : handleAdvancedSearch}
              aria-label="Search"
              disabled={isLoading}
            >
              <FiSearch className="text-3xl" />
            </button>
          </div>
        </div>


        {/* Modal de filtros manuales */}
        {showFilters && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl" ref={filtersRef}>
              <h3 className="font-bold text-lg">Manual Filter</h3>
              <p className="py-2 opacity-70">
                Fill the fields to refine your search and press{" "}
                <span className="font-semibold">Advanced Search</span>.
              </p>

              <form onSubmit={handleAdvancedSearch} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Organism */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Organism</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Enter organism name"
                      value={organism}
                      onChange={(e) => setOrganism(e.target.value)}
                    />
                  </div>

                  {/* Accession */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Accession (OSD-)</span>
                    </label>
                    <label className="input input-bordered flex items-center gap-2">
                      <span className="opacity-70">OSD-</span>
                      <input
                        type="text"
                        className="grow"
                        placeholder="e.g. 001A"
                        value={accession}
                        onChange={(e) => setAccession(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Assay */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Assay</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Type assay..."
                      value={assay}
                      onChange={(e) => setAssay(e.target.value)}
                    />
                  </div>

                  {/* Factors */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Factors</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Type factors..."
                      value={factors}
                      onChange={(e) => setFactors(e.target.value)}
                    />
                  </div>

                  {/* Year */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Year</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="e.g. 2024"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      min={1960}
                      max={2025}
                    />
                  </div>

                  {/* Mission */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Mission</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                    >
                      <option value="">Select mission…</option>
                      {missionOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* File Type */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text">File Type</span>
                    </label>
                    <div className="dropdown">
                      <div
                        tabIndex={0}
                        role="button"
                        className="btn w-full justify-between"
                        onClick={() => setFileOptionsOpen((v) => !v)}
                      >
                        <span>{fileType || "Choose file type…"}</span>
                        <span className="opacity-70">
                          {fileOptionsOpen ? "▴" : "▾"}
                        </span>
                      </div>
                      {fileOptionsOpen && (
                        <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full mt-2">
                          {fileOptions.map((opt) => (
                            <li key={opt}>
                              <button
                                type="button"
                                className={`btn btn-sm justify-start ${fileType === opt
                                  ? "btn-primary"
                                  : "btn-ghost"
                                  }`}
                                onClick={() => toggleFileType(opt)}
                              >
                                {opt}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={clearFilters}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    className={`btn ${isLoading ? "btn-disabled" : "btn-primary"
                      }`}
                    disabled={isLoading}
                  >
                    {isLoading ? "Searching..." : "Advanced Search"}
                  </button>
                </div>
              </form>

              <button
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={() => setShowFilters(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Resultados */}
        {isSearching && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                className="btn btn-circle btn-outline"
                onClick={resetView}
                aria-label="Back"
              >
                <FiArrowLeft />
              </button>
              <div>
                <h4 className="text-lg font-semibold">
                  {searchMode === "ai"
                    ? `AI Search: "${query}"`
                    : "Advanced Filter Results"}
                </h4>
              </div>
            </div>

            {/* Filtros activos */}
            {searchMode === "manual" && hasActiveFilters && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {organism && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Organism: {organism}
                    </span>
                  )}
                  {accession && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Accession: OSD-{accession}
                    </span>
                  )}
                  {fileType && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      File Type: {fileType}
                    </span>
                  )}
                  {assay && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Assay: {assay}
                    </span>
                  )}
                  {factors && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Factors: {factors}
                    </span>
                  )}
                  {year && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Year: {year}
                    </span>
                  )}
                  {mission && (
                    <span
                      className="badge badge-info badge-outline cursor-pointer"
                      onClick={editFilter}
                    >
                      Mission: {mission}
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-70 mt-1">
                  Click any filter to edit.
                </p>
              </div>
            )}

            {/* Ejemplo de resultados */}
            <div className="grid gap-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="badge badge-ghost mb-2">NASA Study</div>
                  <h5 className="card-title">
                    Effects of Microgravity on Plant Growth
                  </h5>
                  <div className="text-sm opacity-70 flex flex-wrap gap-2">
                    <span>ISS</span>•<span>2023</span>•<span>Plant Biology</span>•
                    <span>Accession: OSD-045B</span>
                  </div>
                  <p className="mt-2">
                    Analysis of <em>Arabidopsis thaliana</em> growth under
                    microgravity aboard the ISS.
                  </p>
                  <div className="card-actions justify-end">
                    <button className="btn btn-primary">View Study</button>
                    <button className="btn btn-outline">Download Data</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
  return body;
}

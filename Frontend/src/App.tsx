import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-dvh bg-base-200 text-base-content">
      <div className="container mx-auto max-w-2xl p-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">React + Tailwind + DaisyUI</h1>
          <label className="swap swap-rotate">
            {/* Dark/Light toggle (usa el atributo data-theme en <html> si quieres forzar tema) */}
            <input
              type="checkbox"
              onChange={(e) =>
                document.documentElement.setAttribute(
                  "data-theme",
                  e.target.checked ? "dark" : "light"
                )
              }
            />
            <svg className="swap-off h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M5.64 17.657A9 9 0 0018.36 4.929 7 7 0 115.64 17.657z" />
            </svg>
            <svg className="swap-on h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 18a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm6.364-2.05l1.414 1.414a1 1 0 01-1.414 1.415l-1.415-1.415a1 1 0 111.415-1.414zM4.636 15.95a1 1 0 011.415 1.414L4.636 18.78A1 1 0 113.222 17.364l1.414-1.414zM18 11a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM3 12a1 1 0 100-2h2a1 1 0 100 2H3zm13.657-6.364a1 1 0 010-1.415l1.415-1.414A1 1 0 0120.486 4.95l-1.414 1.414a1 1 0 01-1.415-1.414zM4.95 4.95A1 1 0 116.364 3.536L7.778 4.95A1 1 0 016.364 6.364L4.95 4.95zM12 6a1 1 0 01-1-1V3a1 1 0 112 0v2a1 1 0 01-1 1z" />
            </svg>
          </label>
        </header>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">¡Hola DaisyUI!</h2>
            <p>Este es un ejemplo usando componentes con clases DaisyUI.</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary" onClick={() => setCount((c) => c + 1)}>
                Clicks: {count}
              </button>
              <button className="btn btn-outline">Secundario</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { useSerial } from "./hooks/useSerial";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isConnected, isSupported, error, taps, connect, disconnect, clearTaps } =
    useSerial(9600);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white text-black border-b border-black/10 z-50">
        <div className="flex items-center justify-between px-6 py-3 md:px-10">
          <div className="flex items-baseline gap-1.5 md:gap-2 whitespace-nowrap">
            <a
              href="/"
              className="text-base font-bold tracking-wide sm:text-xl md:text-3xl"
            >
              RACHEL 静如 LIU
            </a>
            <span className="text-[10px] sm:text-xs md:text-sm font-normal tracking-widest text-black/50">
              &lt;metrorock soundscape&gt;
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="https://rachelliu.netlify.app/projects"
              className="text-sm tracking-widest transition-opacity hover:opacity-70"
            >
              PROJECTS
            </a>
            <a
              href="https://rachelliu.netlify.app/resume"
              className="text-sm tracking-widest transition-opacity hover:opacity-70"
            >
              RESUMÉ
            </a>
          </nav>
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1.5">
              <span className={`block h-0.5 w-6 bg-black transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-6 bg-black transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-6 bg-black transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col items-center gap-4 border-t border-black/10 pb-6 pt-4 md:hidden">
            <a
              href="https://rachelliu.netlify.app/projects"
              onClick={() => setMenuOpen(false)}
              className="text-sm tracking-widest transition-opacity hover:opacity-70"
            >
              PROJECTS
            </a>
            <a
              href="https://rachelliu.netlify.app/resume"
              onClick={() => setMenuOpen(false)}
              className="text-sm tracking-widest transition-opacity hover:opacity-70"
            >
              RESUMÉ
            </a>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 pt-24 pb-12 md:px-10 max-w-xl mx-auto w-full">
        {/* Connection section */}
        <section className="w-full text-center mb-10">
          <h2 className="text-lg font-bold tracking-wide mb-1 md:text-xl">
            ARDUINO SERIAL LINK
          </h2>
          <p className="text-sm text-black/50 leading-relaxed max-w-sm mx-auto mb-6">
            Connect your Arduino over USB. The piezo sensor sends{" "}
            <code className="text-xs tracking-wide bg-black/5 px-1.5 py-0.5 rounded">
              TAP:0
            </code>{" "}
            events at 9600 baud.
          </p>

          {!isSupported && (
            <div className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] text-black/60 px-4 py-3 text-sm">
              Web Serial API is not supported. Use Chrome or Edge.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] text-black/60 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!isConnected ? (
            <button
              onClick={connect}
              disabled={!isSupported}
              className="px-6 py-2 rounded-full bg-black text-white text-sm font-medium tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-80 cursor-pointer"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-6 py-2 rounded-full border border-black/20 text-black text-sm font-medium tracking-widest uppercase transition-opacity hover:opacity-60 cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </section>

        {/* Tap feed */}
        {isConnected && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-2">
              <h3 className="text-xs font-bold tracking-widest uppercase text-black/60">
                Tap Events
                {taps.length > 0 && (
                  <span className="ml-1.5 font-normal text-black/30">
                    ({taps.length})
                  </span>
                )}
              </h3>
              {taps.length > 0 && (
                <button
                  onClick={clearTaps}
                  className="text-xs tracking-widest uppercase text-black/30 hover:text-black/60 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {taps.length === 0 ? (
              <div className="py-16 text-center text-black/30 text-sm tracking-wide">
                Waiting for taps...
              </div>
            ) : (
              <ul className="space-y-1">
                {taps.map((tap) => (
                  <li
                    key={tap.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-black/[0.02] transition-colors animate-fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
                        {tap.pad}
                      </span>
                      <span className="text-sm font-medium">
                        Pad {tap.pad}
                      </span>
                    </div>
                    <span className="text-xs text-black/30 tabular-nums tracking-wide">
                      {formatTime(tap.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-4 text-center text-[10px] tracking-widest uppercase text-black/30">
        Soundscape &mdash; Web Serial @ 9600 baud
      </footer>
    </div>
  );
}

export default App;

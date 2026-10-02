import { SiteFooter, SiteHeader } from "@rachichi/design";
import { useTouchDesigner } from "./hooks/useTouchDesigner";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function App() {
  const { isConnected, error, taps, clearTaps } = useTouchDesigner({
    url: "ws://localhost:9980",
  });

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      <SiteHeader title="METROROCK SOUNDSCAPE" position="fixed" />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 pt-24 pb-12 md:px-10 max-w-xl mx-auto w-full">
        {/* Status section */}
        <section className="w-full text-center mb-10">
          <h2 className="text-lg font-bold tracking-wide mb-1 md:text-xl">
            TOUCHDESIGNER LINK
          </h2>
          <p className="text-sm text-black/50 leading-relaxed max-w-sm mx-auto mb-6">
            TouchDesigner reads the Arduino serial and sends tap events to this
            dashboard over WebSocket.
          </p>

          {/* Connection status */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-black animate-pulse" : "bg-black/20"
              }`}
            />
            <span className="text-xs tracking-widest uppercase">
              {isConnected ? "TouchDesigner connected" : "Waiting for TouchDesigner"}
            </span>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.02] text-black/50 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Live TD visual */}
          <div className="mt-6 w-full aspect-video rounded-lg overflow-hidden border border-black/10 bg-black">
            <img
              src="http://localhost:9981/frame.jpg"
              alt="Live projector output"
              className="w-full h-full object-cover"
              onLoad={(e) => {
                const img = e.currentTarget;
                setTimeout(() => {
                  img.src = `http://localhost:9981/frame.jpg?t=${Date.now()}`;
                }, 50);
              }}
              onError={(e) => {
                const img = e.currentTarget;
                setTimeout(() => {
                  img.src = `http://localhost:9981/frame.jpg?t=${Date.now()}`;
                }, 1000);
              }}
            />
          </div>
        </section>

        {/* Tap feed */}
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
              {isConnected
                ? "Connected — waiting for taps..."
                : "Start TouchDesigner to see tap events here."}
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
                    <span className="text-sm font-medium">Pad {tap.pad}</span>
                  </div>
                  <span className="text-xs text-black/30 tabular-nums tracking-wide">
                    {formatTime(tap.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter stack="react, typescript, touchdesigner, arduino" />
    </div>
  );
}

export default App;

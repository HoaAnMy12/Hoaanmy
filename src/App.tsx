import { ConnectKitButton } from "connectkit";
import { SwapCard } from "./components/SwapCard";

export default function App() {
  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--bg-gradient)" }}
    >
      {/* Header */}
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: "rgba(172,198,233,0.15)", border: "1px solid rgba(172,198,233,0.2)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2L15 6V12L9 16L3 12V6L9 2Z"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="9" r="2.5" fill="var(--accent)" />
            </svg>
          </div>
          <span
            className="display text-base font-semibold"
            style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            SwapKit Demo
          </span>
        </div>
        <ConnectKitButton />
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-4 text-center">
        <h1
          className="display text-4xl font-bold"
          style={{ color: "var(--ink)", letterSpacing: "-0.03em" }}
        >
          Swap any token,
          <br />
          <span style={{ color: "var(--accent)" }}>across any chain.</span>
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--muted)", maxWidth: "38ch", margin: "12px auto 0" }}
        >
          Powered by Circle App Kit and LiFi routing. Permissionless, non-custodial swaps.
        </p>
      </div>

      {/* Swap card */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <SwapCard />
      </main>
    </div>
  );
}

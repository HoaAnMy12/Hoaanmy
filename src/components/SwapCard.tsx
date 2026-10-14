import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectKitButton } from "connectkit";
import type { EIP1193Provider } from "viem";
import { AppKit } from "@circle-fin/app-kit";
import type { SwapEstimate as AppKitSwapEstimate } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

const kit = new AppKit();

// Supported mainnet chains (swap is mainnet-only via LiFi routing)
const SWAP_CHAINS = [
  { id: "Ethereum", label: "Ethereum", chainId: 1 },
  { id: "Base", label: "Base", chainId: 8453 },
  { id: "Arbitrum", label: "Arbitrum", chainId: 42161 },
  { id: "Optimism", label: "Optimism", chainId: 10 },
  { id: "Polygon", label: "Polygon", chainId: 137 },
  { id: "Avalanche", label: "Avalanche", chainId: 43114 },
] as const;

type SwapChainId = (typeof SWAP_CHAINS)[number]["id"];

const TOKENS = ["USDC", "USDT", "EURC", "WETH", "DAI"] as const;
type Token = (typeof TOKENS)[number];

type SwapStatus =
  | "idle"
  | "estimating"
  | "estimated"
  | "awaiting_wallet"
  | "swapping"
  | "success"
  | "error";

type EstimateResult = AppKitSwapEstimate;

const glass = {
  card: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.12)",
  } as React.CSSProperties,
  inner: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  } as React.CSSProperties,
  field: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
  } as React.CSSProperties,
};

// Token selector dropdown
function TokenSelector({
  value,
  onChange,
  exclude,
}: {
  value: Token;
  onChange: (t: Token) => void;
  exclude: Token;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "rgba(172,198,233,0.15)",
          color: "var(--ink)",
          border: "1px solid rgba(172,198,233,0.25)",
        }}
      >
        <span className="tabular-nums">{value}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-20 mt-1.5 w-32 overflow-hidden rounded-2xl py-1 shadow-2xl"
            style={{
              background: "rgba(13,27,47,0.95)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {TOKENS.filter((t) => t !== exclude).map((t) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-white/10"
                style={{ color: t === value ? "var(--accent)" : "var(--ink)" }}
              >
                {t}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Chain selector dropdown
function ChainSelector({
  value,
  onChange,
}: {
  value: SwapChainId;
  onChange: (c: SwapChainId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SWAP_CHAINS.find((c) => c.id === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/10"
        style={{ color: "var(--muted)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {current.label}
        <ChevronDown className="size-3 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-2xl py-1 shadow-2xl"
            style={{
              background: "rgba(13,27,47,0.95)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {SWAP_CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium transition-colors hover:bg-white/10"
                style={{
                  color: c.id === value ? "var(--accent)" : "var(--ink-2)",
                }}
              >
                {c.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SwapCard() {
  const { connector, address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [tokenIn, setTokenIn] = useState<Token>("USDT");
  const [tokenOut, setTokenOut] = useState<Token>("USDC");
  const [chain, setChain] = useState<SwapChainId>("Ethereum");
  const [amount, setAmount] = useState("");
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [lockedAddress, setLockedAddress] = useState<string | undefined>();
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txResult, setTxResult] = useState<{
    txHash?: string;
    explorerUrl?: string;
    amountOut?: string;
    tokenOut?: string;
  } | null>(null);

  // Reset estimate when inputs change
  useEffect(() => {
    setEstimate(null);
    if (status === "estimated") setStatus("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, chain, amount]);

  const getTargetChainId = useCallback(() => {
    const entry = SWAP_CHAINS.find((c) => c.id === chain);
    return entry?.chainId ?? 1;
  }, [chain]);

  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error("Wallet not connected");
    const targetChainId = getTargetChainId();
    await switchChainAsync({ chainId: targetChainId });
    const provider = (await connector.getProvider()) as EIP1193Provider;
    return createViemAdapterFromProvider({ provider });
  }, [connector, switchChainAsync, getTargetChainId]);

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setEstimate(null);
    setStatus("idle");
  };

  const handleEstimate = async () => {
    if (!amount || Number(amount) <= 0) return;
    setStatus("estimating");
    setErrorMsg("");
    try {
      const adapter = await getAdapter();
      const est = await kit.estimateSwap({
        from: { adapter, chain },
        tokenIn,
        tokenOut,
        amountIn: amount,
        config: { slippageBps: 150 },
      });
      setEstimate(est);
      setLockedAddress(address);
      setStatus("estimated");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.slice(0, 120)
          : "Failed to get estimate. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const handleSwap = async () => {
    if (!estimate || address !== lockedAddress) {
      setStatus("idle");
      setEstimate(null);
      return;
    }
    setStatus("awaiting_wallet");
    setErrorMsg("");
    try {
      const adapter = await getAdapter();
      setStatus("swapping");
      const result = await kit.swap({
        from: { adapter, chain },
        tokenIn,
        tokenOut,
        amountIn: amount,
        config: { slippageBps: 150 },
      });
      setTxResult({
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        amountOut: result.amountOut,
        tokenOut: result.tokenOut,
      });
      setStatus("success");
      setEstimate(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("user rejected") || (err as {code?: number}).code === 4001
            ? "Transaction cancelled."
            : err.message.slice(0, 120)
          : "Swap failed. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setEstimate(null);
    setErrorMsg("");
    setTxResult(null);
    setAmount("");
  };

  const isLoading =
    status === "estimating" ||
    status === "awaiting_wallet" ||
    status === "swapping";

  const amountNum = Number(amount);
  const canEstimate =
    isConnected &&
    amount !== "" &&
    amountNum > 0 &&
    status !== "estimating" &&
    status !== "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md mx-auto"
    >
      <div className="rounded-3xl p-5 shadow-2xl" style={glass.card}>
        {/* Header row */}
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="display text-xl font-semibold"
            style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            Swap
          </h2>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: "rgba(172,198,233,0.12)",
                color: "var(--muted)",
              }}
            >
              1.5% max slippage
            </span>
          </div>
        </div>

        {/* Chain selector */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--subtle)" }}>
            Network
          </span>
          <ChainSelector value={chain} onChange={setChain} />
        </div>

        {/* From panel */}
        <div className="rounded-2xl p-4" style={glass.inner}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>
              You pay
            </span>
            <TokenSelector
              value={tokenIn}
              onChange={setTokenIn}
              exclude={tokenOut}
            />
          </div>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            placeholder="0.00"
            disabled={isLoading || status === "success"}
            className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-20 disabled:opacity-50"
            style={{ color: "var(--ink)" }}
          />
        </div>

        {/* Flip button */}
        <div className="flex justify-center py-2">
          <button
            onClick={handleFlip}
            disabled={isLoading}
            className="flex size-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:rotate-180 active:scale-95 disabled:opacity-40"
            style={{
              background: "rgba(172,198,233,0.15)",
              border: "1px solid rgba(172,198,233,0.25)",
              transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <ArrowUpDown className="size-4" style={{ color: "var(--accent)" }} />
          </button>
        </div>

        {/* To panel */}
        <div className="rounded-2xl p-4" style={glass.inner}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>
              You receive
            </span>
            <TokenSelector
              value={tokenOut}
              onChange={setTokenOut}
              exclude={tokenIn}
            />
          </div>
          <div
            className="display text-4xl font-bold tabular-nums"
            style={{ color: estimate ? "var(--ink)" : "var(--subtle)", opacity: estimate ? 1 : 0.35 }}
          >
            {estimate ? estimate.estimatedOutput.amount : "—"}
          </div>
          {estimate && (
            <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>
              Estimated · market rates apply
            </p>
          )}
        </div>

        {/* Estimate rows */}
        <AnimatePresence>
          {estimate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl px-4 py-3"
              style={glass.field}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--subtle)" }}>
                    Expected output
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: "var(--ink)" }}
                  >
                    {estimate.estimatedOutput.amount} {estimate.estimatedOutput.token}
                  </span>
                </div>
                {estimate.fees?.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs capitalize" style={{ color: "var(--subtle)" }}>
                      {f.type} fee
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                      {f.amount} {f.token}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1 pt-0.5">
                  <Info className="size-3" style={{ color: "var(--subtle)" }} />
                  <span className="text-xs" style={{ color: "var(--subtle)" }}>
                    Routed via LiFi — subject to their terms
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {status === "error" && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-start gap-2 rounded-2xl px-4 py-3"
              style={{ background: "rgba(232,109,122,0.12)", border: "1px solid rgba(232,109,122,0.25)" }}
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" style={{ color: "var(--danger)" }} />
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {errorMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success */}
        <AnimatePresence>
          {status === "success" && txResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl px-4 py-3"
              style={{ background: "rgba(141,216,159,0.10)", border: "1px solid rgba(141,216,159,0.25)" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4" style={{ color: "var(--success)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                  Swap complete
                </span>
              </div>
              {txResult.amountOut && (
                <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                  Received {txResult.amountOut} {txResult.tokenOut}
                </p>
              )}
              {txResult.explorerUrl && (
                <a
                  href={txResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  View on explorer
                  <ExternalLink className="size-3" />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main CTA */}
        <div className="mt-4">
          {!isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: "var(--accent)", color: "#0d1b2f" }}
                >
                  Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : status === "success" ? (
            <button
              onClick={reset}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(141,216,159,0.15)",
                color: "var(--success)",
                border: "1px solid rgba(141,216,159,0.3)",
              }}
            >
              New Swap
            </button>
          ) : status === "estimated" ? (
            <button
              onClick={() => void handleSwap()}
              disabled={isLoading || address !== lockedAddress}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#0d1b2f" }}
            >
              {`Swap ${amount} ${tokenIn} → ${tokenOut}`}
            </button>
          ) : (
            <button
              onClick={() => void handleEstimate()}
              disabled={!canEstimate || isLoading}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#0d1b2f" }}
            >
              {status === "estimating" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Getting quote…
                </span>
              ) : status === "swapping" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Swapping…
                </span>
              ) : (
                "Get Quote"
              )}
            </button>
          )}
        </div>

        {/* Mainnet notice */}
        <p className="mt-3 text-center text-xs" style={{ color: "var(--subtle)" }}>
          Swap routes real mainnet assets. Start with small amounts.
        </p>
      </div>
    </motion.div>
  );
}

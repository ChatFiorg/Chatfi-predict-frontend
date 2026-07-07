import { FC, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolDisplay } from "../lib/chatfi-predict-client";

// First two match the original lime/coral Yes/No look; extra hues cover
// outcomes 3-8 for multi-choice pools.
const PALETTE = ["#d7ff3f", "#ff5a3c", "#3fa9ff", "#ffbb3f", "#c93fff", "#3fffc9", "#ff3f8f", "#8f8f3f"];

function timeUntil(unixTs: number): string {
  const diff = unixTs * 1000 - Date.now();
  if (diff <= 0) return "now";
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d`;
  if (hrs >= 1) return `${hrs}h`;
  return `${Math.floor(diff / (1000 * 60))}m`;
}

interface Props {
  pool: PoolDisplay;
  poolPda: PublicKey;
  currentWallet: PublicKey | null;
  onStake: (poolPda: PublicKey, outcome: number, amount: number) => Promise<void>;
  onPropose: (poolPda: PublicKey, outcome: number) => Promise<void>;
  onDispute: (poolPda: PublicKey) => Promise<void>;
  onFinalize: (poolPda: PublicKey) => Promise<void>;
  onAdminResolve: (poolPda: PublicKey, outcome: number) => Promise<void>;
  onClaim: (poolPda: PublicKey) => Promise<void>;
}

export const PoolCard: FC<Props> = ({
  pool,
  poolPda,
  currentWallet,
  onStake,
  onPropose,
  onDispute,
  onFinalize,
  onAdminResolve,
  onClaim,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);

  const isAdmin = currentWallet && pool.admin.equals(currentWallet);
  const now = Math.floor(Date.now() / 1000);
  const bettingOpen = pool.status === "open" && now < pool.closeTs;
  const canPropose = (pool.status === "open" || pool.status === "closed") && now >= pool.resolveTs;
  const disputeWindowOpen = pool.status === "proposed" && pool.disputeDeadline !== null && now < pool.disputeDeadline;
  const disputeWindowClosed = pool.status === "proposed" && pool.disputeDeadline !== null && now >= pool.disputeDeadline;
  const isProposer = currentWallet && pool.proposer && pool.proposer.equals(currentWallet);

  const stampClass =
    pool.status === "open"
      ? "live"
      : pool.status === "resolved"
      ? "resolved"
      : pool.status === "proposed" || pool.status === "disputed"
      ? "closed"
      : "closed";
  const stampLabel =
    pool.status === "open"
      ? "Live"
      : pool.status === "resolved"
      ? "Settled"
      : pool.status === "proposed"
      ? "Proposed"
      : pool.status === "disputed"
      ? "Disputed"
      : "Closed";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="coupon">
      <div className="coupon-top">
        <span className="coupon-id">#{poolPda.toBase58().slice(0, 6)}</span>
        <span className={`stamp ${stampClass}`}>{stampLabel}</span>
      </div>

      <p className="coupon-question">{pool.question}</p>

      <div className="odds-bar">
        {pool.oddsPercent.map((pct, i) => (
          <div key={i} style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
        ))}
      </div>
      <div className="odds-labels" style={{ flexWrap: "wrap", gap: "4px 12px" }}>
        {pool.outcomeNames.map((name, i) => (
          <span key={i} style={{ color: PALETTE[i % PALETTE.length] }}>
            {name} {pool.oddsPercent[i]}%
          </span>
        ))}
      </div>

      {/* --- Staking (pool is open, betting still active) --- */}
      {bettingOpen && selected === null && (
        <div className="coupon-actions" style={{ flexWrap: "wrap" }}>
          {pool.outcomeNames.map((name, i) => (
            <button
              key={i}
              style={{ background: PALETTE[i % PALETTE.length], color: "#0a0b08", flex: "1 1 45%" }}
              onClick={() => setSelected(i)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {bettingOpen && selected !== null && (
        <div className="coupon-actions" style={{ flexDirection: "column", gap: 8 }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in SOL"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: "10px 12px",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ background: PALETTE[selected % PALETTE.length], color: "#0a0b08" }}
              disabled={busy}
              onClick={() => run(() => onStake(poolPda, selected, parseFloat(amount)))}
            >
              {busy ? "Confirming..." : `Stake ${amount} on ${pool.outcomeNames[selected]}`}
            </button>
            <button className="btn-secondary" onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- Propose a result (betting closed, resolve_ts passed) --- */}
      {canPropose && selected === null && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Betting closed. Propose the result:
          </p>
          <div className="coupon-actions" style={{ flexWrap: "wrap" }}>
            {pool.outcomeNames.map((name, i) => (
              <button
                key={i}
                className="btn-secondary"
                style={{ flex: "1 1 45%" }}
                disabled={busy}
                onClick={() => run(() => onPropose(poolPda, i))}
              >
                Propose "{name}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Proposed: dispute window --- */}
      {pool.status === "proposed" && pool.proposedOutcome !== null && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 8 }}>
            Proposed winner: <span style={{ color: "var(--lime)" }}>{pool.outcomeNames[pool.proposedOutcome]}</span>
          </p>
          {disputeWindowOpen && (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                Dispute window closes in {timeUntil(pool.disputeDeadline!)}
              </p>
              {!isProposer && (
                <button className="btn-no" style={{ width: "100%" }} disabled={busy} onClick={() => run(() => onDispute(poolPda))}>
                  {busy ? "Confirming..." : "Dispute this result"}
                </button>
              )}
            </>
          )}
          {disputeWindowClosed && (
            <button className="btn-primary" style={{ width: "100%" }} disabled={busy} onClick={() => run(() => onFinalize(poolPda))}>
              {busy ? "Confirming..." : "Finalize (uncontested)"}
            </button>
          )}
        </div>
      )}

      {/* --- Disputed: admin tiebreak --- */}
      {pool.status === "disputed" && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--coral)", marginBottom: 8 }}>
            Disputed — awaiting admin decision
          </p>
          {isAdmin && (
            <div className="coupon-actions" style={{ flexWrap: "wrap" }}>
              {pool.outcomeNames.map((name, i) => (
                <button
                  key={i}
                  className="btn-secondary"
                  style={{ flex: "1 1 45%" }}
                  disabled={busy}
                  onClick={() => run(() => onAdminResolve(poolPda, i))}
                >
                  Rule "{name}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Resolved: claim --- */}
      {pool.status === "resolved" && pool.winningOutcome !== null && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 8 }}>
            Winner: <span style={{ color: "var(--lime)" }}>{pool.outcomeNames[pool.winningOutcome]}</span>
          </p>
          <button className="btn-primary" style={{ width: "100%" }} disabled={busy} onClick={() => run(() => onClaim(poolPda))}>
            {busy ? "Confirming..." : "Claim payout"}
          </button>
        </div>
      )}

      <div className="coupon-meta">
        <span>{pool.isNativeSol ? "SOL pool" : "USDC pool"}</span>
        <span>{bettingOpen ? `${timeUntil(pool.closeTs)} left` : stampLabel}</span>
      </div>
    </div>
  );
};

import { FC, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolDisplay } from "../lib/chatfi-predict-client";

function timeUntil(unixTs: number): string {
  const diff = unixTs * 1000 - Date.now();
  if (diff <= 0) return "closed";
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d left`;
  if (hrs >= 1) return `${hrs}h left`;
  return `${Math.floor(diff / (1000 * 60))}m left`;
}

interface Props {
  pool: PoolDisplay;
  poolPda: PublicKey;
  onStake: (poolPda: PublicKey, outcome: 0 | 1, amount: number) => Promise<void>;
}

export const PoolCard: FC<Props> = ({ pool, poolPda, onStake }) => {
  const [selected, setSelected] = useState<0 | 1 | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);

  const stampClass =
    pool.status === "open" ? "live" : pool.status === "resolved" ? "resolved" : "closed";
  const stampLabel =
    pool.status === "open" ? "Live" : pool.status === "resolved" ? "Settled" : "Closed";

  async function confirmStake() {
    if (selected === null) return;
    setBusy(true);
    try {
      await onStake(poolPda, selected, parseFloat(amount));
      setSelected(null);
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
        <div className="yes" style={{ width: `${pool.oddsPercent[0]}%` }} />
        <div className="no" style={{ width: `${pool.oddsPercent[1]}%` }} />
      </div>
      <div className="odds-labels">
        <span className="yes-label">
          {pool.outcomeNames[0]} {pool.oddsPercent[0]}%
        </span>
        <span className="no-label">
          {pool.outcomeNames[1]} {pool.oddsPercent[1]}%
        </span>
      </div>

      {pool.status === "open" && selected === null && (
        <div className="coupon-actions">
          <button className="btn-yes" onClick={() => setSelected(0)}>
            {pool.outcomeNames[0]}
          </button>
          <button className="btn-no" onClick={() => setSelected(1)}>
            {pool.outcomeNames[1]}
          </button>
        </div>
      )}

      {selected !== null && (
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
              className={selected === 0 ? "btn-yes" : "btn-no"}
              disabled={busy}
              onClick={confirmStake}
            >
              {busy ? "Confirming..." : `Stake ${amount} on ${pool.outcomeNames[selected]}`}
            </button>
            <button className="btn-secondary" onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="coupon-meta">
        <span>{pool.isNativeSol ? "SOL pool" : "USDC pool"}</span>
        <span>{pool.status === "open" ? timeUntil(pool.closeTs) : stampLabel}</span>
      </div>
    </div>
  );
};

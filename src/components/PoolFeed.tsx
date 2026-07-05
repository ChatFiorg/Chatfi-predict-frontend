import { FC } from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolDisplay } from "../lib/chatfi-predict-client";
import { PoolCard } from "./PoolCard";

interface Props {
  pools: { display: PoolDisplay; pda: PublicKey }[];
  onStake: (poolPda: PublicKey, outcome: 0 | 1, amount: number) => Promise<void>;
}

export const PoolFeed: FC<Props> = ({ pools, onStake }) => {
  return (
    <section id="pools" className="container">
      <div className="section-heading">
        <h2>Live pools</h2>
        <span className="count">{pools.length} total</span>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          No pools yet. Be the first to create one.
        </div>
      ) : (
        <div className="pool-grid">
          {pools.map(({ display, pda }) => (
            <PoolCard key={pda.toBase58()} pool={display} poolPda={pda} onStake={onStake} />
          ))}
        </div>
      )}
    </section>
  );
};

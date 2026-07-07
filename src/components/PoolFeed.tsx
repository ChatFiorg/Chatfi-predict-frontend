import { FC } from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolDisplay } from "../lib/chatfi-predict-client";
import { PoolCard } from "./PoolCard";

interface Props {
  pools: { display: PoolDisplay; pda: PublicKey }[];
  currentWallet: PublicKey | null;
  onStake: (poolPda: PublicKey, outcome: number, amount: number) => Promise<void>;
  onPropose: (poolPda: PublicKey, outcome: number) => Promise<void>;
  onDispute: (poolPda: PublicKey) => Promise<void>;
  onFinalize: (poolPda: PublicKey) => Promise<void>;
  onAdminResolve: (poolPda: PublicKey, outcome: number) => Promise<void>;
  onClaim: (poolPda: PublicKey) => Promise<void>;
}

export const PoolFeed: FC<Props> = ({
  pools,
  currentWallet,
  onStake,
  onPropose,
  onDispute,
  onFinalize,
  onAdminResolve,
  onClaim,
}) => {
  return (
    <section id="pools" className="container">
      <div className="section-heading">
        <h2>Live pools</h2>
        <span className="count">{pools.length} total</span>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">No pools yet. Be the first to create one.</div>
      ) : (
        <div className="pool-grid">
          {pools.map(({ display, pda }) => (
            <PoolCard
              key={pda.toBase58()}
              pool={display}
              poolPda={pda}
              currentWallet={currentWallet}
              onStake={onStake}
              onPropose={onPropose}
              onDispute={onDispute}
              onFinalize={onFinalize}
              onAdminResolve={onAdminResolve}
              onClaim={onClaim}
            />
          ))}
        </div>
      )}
    </section>
  );
};

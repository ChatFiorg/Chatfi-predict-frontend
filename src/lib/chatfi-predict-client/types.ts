import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export type PoolStatus = "open" | "closed" | "resolved" | "cancelled";

/** Raw shape as decoded by the Anchor Program's account fetcher. */
export interface PoolAccount {
  creator: PublicKey;
  admin: PublicKey;
  question: string;
  outcomeNames: [string, string];
  tokenMint: PublicKey | null;
  vaultAuthority: PublicKey;
  vaultTokenAccount: PublicKey;
  totalStaked: BN;
  stakePerOutcome: [BN, BN];
  closeTs: BN;
  resolveTs: BN;
  status: { open?: {} } | { closed?: {} } | { resolved?: {} } | { cancelled?: {} };
  winningOutcome: number | null;
  feeTaken: BN;
  feesCollected: boolean;
  bump: number;
  vaultBump: number;
  vaultTokenBump: number;
}

export interface StakeAccount {
  pool: PublicKey;
  user: PublicKey;
  outcome: number;
  amount: BN;
  claimed: boolean;
  bump: number;
}

/** Display-friendly view of a pool for building the trade UI. */
export interface PoolDisplay {
  question: string;
  outcomeNames: [string, string];
  isNativeSol: boolean;
  tokenMint: PublicKey | null;
  totalStakedRaw: BN;
  stakePerOutcomeRaw: [BN, BN];
  /** Percentage (0-100) currently backing each outcome, for odds display. */
  oddsPercent: [number, number];
  closeTs: number;
  resolveTs: number;
  status: PoolStatus;
  winningOutcome: number | null;
  feesCollected: boolean;
}

export function decodePoolStatus(raw: PoolAccount["status"]): PoolStatus {
  if ("open" in raw) return "open";
  if ("closed" in raw) return "closed";
  if ("resolved" in raw) return "resolved";
  return "cancelled";
}

/** Converts a raw decoded Pool account into UI-ready display data. */
export function toPoolDisplay(pool: PoolAccount): PoolDisplay {
  const totalStaked = pool.totalStaked;
  const [a, b] = pool.stakePerOutcome;
  const totalNum = totalStaked.toNumber();
  const oddsPercent: [number, number] =
    totalNum === 0
      ? [50, 50]
      : [
          Math.round((a.toNumber() / totalNum) * 100),
          Math.round((b.toNumber() / totalNum) * 100),
        ];

  return {
    question: pool.question,
    outcomeNames: pool.outcomeNames,
    isNativeSol: pool.tokenMint === null,
    tokenMint: pool.tokenMint,
    totalStakedRaw: totalStaked,
    stakePerOutcomeRaw: pool.stakePerOutcome,
    oddsPercent,
    closeTs: pool.closeTs.toNumber(),
    resolveTs: pool.resolveTs.toNumber(),
    status: decodePoolStatus(pool.status),
    winningOutcome: pool.winningOutcome,
    feesCollected: pool.feesCollected,
  };
}

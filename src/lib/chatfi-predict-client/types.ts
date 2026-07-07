import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export type PoolStatus = "open" | "closed" | "proposed" | "disputed" | "resolved" | "cancelled";

/** Raw shape as decoded by the Anchor Program's account fetcher. */
export interface PoolAccount {
  creator: PublicKey;
  admin: PublicKey;
  question: string;
  outcomeCount: number;
  /** Fixed-size array of 8 slots; only the first outcomeCount are meaningful. */
  outcomeNames: string[];
  tokenMint: PublicKey | null;
  vaultAuthority: PublicKey;
  vaultTokenAccount: PublicKey;
  totalStaked: BN;
  /** Fixed-size array of 8 slots; only the first outcomeCount are meaningful. */
  stakePerOutcome: BN[];
  closeTs: BN;
  resolveTs: BN;
  status:
    | { open?: {} }
    | { closed?: {} }
    | { proposed?: {} }
    | { disputed?: {} }
    | { resolved?: {} }
    | { cancelled?: {} };
  winningOutcome: number | null;
  proposedOutcome: number | null;
  proposer: PublicKey | null;
  proposeTs: BN | null;
  disputeDeadline: BN | null;
  disputer: PublicKey | null;
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

export interface ConfigAccount {
  authority: PublicKey;
  platformTreasury: PublicKey;
  poolCreationFeeLamports: BN;
  disputeBondLamports: BN;
  disputeWindowSecs: BN;
  bump: number;
}

/** Display-friendly view of a pool for building the trade UI. */
export interface PoolDisplay {
  question: string;
  /** Only the first outcomeCount entries are meaningful. */
  outcomeNames: string[];
  outcomeCount: number;
  isNativeSol: boolean;
  tokenMint: PublicKey | null;
  totalStakedRaw: BN;
  stakePerOutcomeRaw: BN[];
  /** Percentage (0-100) currently backing each outcome, for odds display. */
  oddsPercent: number[];
  closeTs: number;
  resolveTs: number;
  status: PoolStatus;
  winningOutcome: number | null;
  feesCollected: boolean;
  proposedOutcome: number | null;
  proposer: PublicKey | null;
  disputeDeadline: number | null;
  disputer: PublicKey | null;
  admin: PublicKey;
  creator: PublicKey;
}

export function decodePoolStatus(raw: PoolAccount["status"]): PoolStatus {
  if ("open" in raw) return "open";
  if ("closed" in raw) return "closed";
  if ("proposed" in raw) return "proposed";
  if ("disputed" in raw) return "disputed";
  if ("resolved" in raw) return "resolved";
  return "cancelled";
}

/** Converts a raw decoded Pool account into UI-ready display data. */
export function toPoolDisplay(pool: PoolAccount): PoolDisplay {
  const count = pool.outcomeCount;
  const activeNames = pool.outcomeNames.slice(0, count);
  const activeStakes = pool.stakePerOutcome.slice(0, count);
  const totalNum = pool.totalStaked.toNumber();

  const oddsPercent =
    totalNum === 0
      ? activeStakes.map(() => Math.round(100 / count))
      : activeStakes.map((s) => Math.round((s.toNumber() / totalNum) * 100));

  return {
    question: pool.question,
    outcomeNames: activeNames,
    outcomeCount: count,
    isNativeSol: pool.tokenMint === null,
    tokenMint: pool.tokenMint,
    totalStakedRaw: pool.totalStaked,
    stakePerOutcomeRaw: activeStakes,
    oddsPercent,
    closeTs: pool.closeTs.toNumber(),
    resolveTs: pool.resolveTs.toNumber(),
    status: decodePoolStatus(pool.status),
    winningOutcome: pool.winningOutcome,
    feesCollected: pool.feesCollected,
    proposedOutcome: pool.proposedOutcome,
    proposer: pool.proposer,
    disputeDeadline: pool.disputeDeadline ? pool.disputeDeadline.toNumber() : null,
    disputer: pool.disputer,
    admin: pool.admin,
    creator: pool.creator,
  };
}

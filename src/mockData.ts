import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PoolDisplay } from "./lib/chatfi-predict-client";

function mockPda(seed: string): PublicKey {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < seed.length; i++) bytes[i % 32] ^= seed.charCodeAt(i);
  return new PublicKey(bytes);
}

const now = Math.floor(Date.now() / 1000);

function pool(
  question: string,
  outcomeNames: string[],
  oddsPercent: number[],
  isNativeSol: boolean,
  status: PoolDisplay["status"],
  closeOffsetSecs: number
): PoolDisplay {
  return {
    question,
    outcomeNames,
    outcomeCount: outcomeNames.length,
    isNativeSol,
    tokenMint: isNativeSol ? null : mockPda("usdc"),
    totalStakedRaw: new BN(0),
    stakePerOutcomeRaw: outcomeNames.map(() => new BN(0)),
    oddsPercent,
    closeTs: now + closeOffsetSecs,
    resolveTs: now + closeOffsetSecs + 300,
    status,
    winningOutcome: status === "resolved" ? 0 : null,
    feesCollected: status === "resolved",
    proposedOutcome: null,
    proposer: null,
    disputeDeadline: null,
    disputer: null,
    admin: mockPda("admin"),
    creator: mockPda("creator"),
  };
}

export const DEMO_POOLS: { display: PoolDisplay; pda: PublicKey }[] = [
  {
    pda: mockPda("tinubu-address"),
    display: pool("Will Tinubu address the nation today?", ["Yes", "No"], [64, 36], true, "open", 3600 * 6),
  },
  {
    pda: mockPda("lekki-flood"),
    display: pool("Will Lekki flood before 6pm today?", ["Yes", "No"], [41, 59], true, "open", 3600 * 2),
  },
  {
    pda: mockPda("2027-election"),
    display: pool(
      "Who wins the 2027 presidential election?",
      ["Tinubu", "Obi", "Atiku"],
      [45, 33, 22],
      true,
      "open",
      3600 * 24 * 30
    ),
  },
  {
    pda: mockPda("davido-posts"),
    display: pool(
      "How many posts will Davido make today?",
      ["0-2", "3-5", "6+"],
      [20, 35, 45],
      false,
      "open",
      3600 * 10
    ),
  },
  {
    pda: mockPda("gist-lover"),
    display: pool("Will GistLover post about Davido before midnight?", ["Yes", "No"], [55, 45], true, "resolved", -3600),
  },
];

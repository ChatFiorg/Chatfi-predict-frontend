import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PoolDisplay } from "./lib/chatfi-predict-client";

function mockPda(seed: string): PublicKey {
  // Deterministic-looking fake address for demo display purposes only.
  const bytes = new Uint8Array(32);
  for (let i = 0; i < seed.length; i++) bytes[i % 32] ^= seed.charCodeAt(i);
  return new PublicKey(bytes);
}

const now = Math.floor(Date.now() / 1000);

export const DEMO_POOLS: { display: PoolDisplay; pda: PublicKey }[] = [
  {
    pda: mockPda("tinubu-address"),
    display: {
      question: "Will Tinubu address the nation today?",
      outcomeNames: ["Yes", "No"],
      isNativeSol: true,
      tokenMint: null,
      totalStakedRaw: new BN(0),
      stakePerOutcomeRaw: [new BN(0), new BN(0)],
      oddsPercent: [64, 36],
      closeTs: now + 3600 * 6,
      resolveTs: now + 3600 * 6 + 300,
      status: "open",
      winningOutcome: null,
      feesCollected: false,
    },
  },
  {
    pda: mockPda("lekki-flood"),
    display: {
      question: "Will Lekki flood before 6pm today?",
      outcomeNames: ["Yes", "No"],
      isNativeSol: true,
      tokenMint: null,
      totalStakedRaw: new BN(0),
      stakePerOutcomeRaw: [new BN(0), new BN(0)],
      oddsPercent: [41, 59],
      closeTs: now + 3600 * 2,
      resolveTs: now + 3600 * 2 + 300,
      status: "open",
      winningOutcome: null,
      feesCollected: false,
    },
  },
  {
    pda: mockPda("davido-posts"),
    display: {
      question: "Will Davido post on IG more than 3 times today?",
      outcomeNames: ["Yes", "No"],
      isNativeSol: false,
      tokenMint: mockPda("usdc"),
      totalStakedRaw: new BN(0),
      stakePerOutcomeRaw: [new BN(0), new BN(0)],
      oddsPercent: [78, 22],
      closeTs: now + 3600 * 10,
      resolveTs: now + 3600 * 10 + 300,
      status: "open",
      winningOutcome: null,
      feesCollected: false,
    },
  },
  {
    pda: mockPda("gist-lover"),
    display: {
      question: "Will GistLover post about Davido before midnight?",
      outcomeNames: ["Yes", "No"],
      isNativeSol: true,
      tokenMint: null,
      totalStakedRaw: new BN(0),
      stakePerOutcomeRaw: [new BN(0), new BN(0)],
      oddsPercent: [55, 45],
      closeTs: now - 3600,
      resolveTs: now - 3300,
      status: "resolved",
      winningOutcome: 0,
      feesCollected: true,
    },
  },
];

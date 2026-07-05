import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  getConfigPda,
  getPoolPda,
  getVaultPda,
  getVaultTokenPda,
  getStakePda,
} from "./pda";
import { PoolAccount, StakeAccount, toPoolDisplay, PoolDisplay } from "./types";

/**
 * `program` is the Anchor Program instance for chatfi-predict, already
 * wired to the user's connection + wallet inside ChatFI's provider.
 * All functions here return the transaction signature (string) on success.
 */

// ---------- One-time setup ----------

export async function initializeConfig(
  program: any,
  authority: PublicKey,
  platformTreasury: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  return program.methods
    .initializeConfig(platformTreasury)
    .accounts({
      authority,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------- Create pool ----------

export interface CreatePoolParams {
  creator: PublicKey;
  admin: PublicKey;
  question: string;
  outcomeNames: [string, string];
  /** Unix seconds. Betting closes at this time. */
  closeTs: number;
  /** Unix seconds. Must be >= closeTs + 60. Earliest time admin can resolve. */
  resolveTs: number;
}

export async function createPoolNative(
  program: any,
  params: CreatePoolParams
): Promise<{ signature: string; poolPda: PublicKey }> {
  const [poolPda] = getPoolPda(params.creator, params.question, program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);

  const signature = await program.methods
    .createPoolNative(
      params.question,
      params.outcomeNames,
      new BN(params.closeTs),
      new BN(params.resolveTs)
    )
    .accounts({
      creator: params.creator,
      admin: params.admin,
      pool: poolPda,
      vaultAuthority: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, poolPda };
}

export async function createPoolSpl(
  program: any,
  params: CreatePoolParams & { tokenMint: PublicKey }
): Promise<{ signature: string; poolPda: PublicKey }> {
  const [poolPda] = getPoolPda(params.creator, params.question, program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [vaultTokenPda] = getVaultTokenPda(poolPda, program.programId);

  const signature = await program.methods
    .createPoolSpl(
      params.question,
      params.outcomeNames,
      new BN(params.closeTs),
      new BN(params.resolveTs)
    )
    .accounts({
      creator: params.creator,
      admin: params.admin,
      tokenMint: params.tokenMint,
      pool: poolPda,
      vaultAuthority: vaultPda,
      vaultTokenAccount: vaultTokenPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, poolPda };
}

// ---------- Place stake ----------

export async function placeStakeNative(
  program: any,
  user: PublicKey,
  poolPda: PublicKey,
  outcome: 0 | 1,
  amountLamports: number | BN
): Promise<string> {
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [stakePda] = getStakePda(poolPda, user, program.programId);

  return program.methods
    .placeStakeNative(outcome, new BN(amountLamports))
    .accounts({
      user,
      pool: poolPda,
      vaultAuthority: vaultPda,
      stake: stakePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function placeStakeSpl(
  program: any,
  user: PublicKey,
  poolPda: PublicKey,
  userTokenAccount: PublicKey,
  outcome: 0 | 1,
  amount: number | BN
): Promise<string> {
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [vaultTokenPda] = getVaultTokenPda(poolPda, program.programId);
  const [stakePda] = getStakePda(poolPda, user, program.programId);

  return program.methods
    .placeStakeSpl(outcome, new BN(amount))
    .accounts({
      user,
      pool: poolPda,
      vaultAuthority: vaultPda,
      vaultTokenAccount: vaultTokenPda,
      userTokenAccount,
      stake: stakePda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------- Resolve ----------

export async function resolvePool(
  program: any,
  admin: PublicKey,
  poolPda: PublicKey,
  winningOutcome: 0 | 1
): Promise<string> {
  return program.methods
    .resolvePool(winningOutcome)
    .accounts({ admin, pool: poolPda })
    .rpc();
}

// ---------- Collect platform + creator fees (permissionless) ----------

export async function collectFeesNative(
  program: any,
  payer: PublicKey,
  poolPda: PublicKey,
  creatorWallet: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const config = await program.account.config.fetch(configPda);

  return program.methods
    .collectFeesNative()
    .accounts({
      payer,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      platformTreasury: config.platformTreasury,
      creatorWallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function collectFeesSpl(
  program: any,
  payer: PublicKey,
  poolPda: PublicKey,
  platformTreasuryTokenAccount: PublicKey,
  creatorTokenAccount: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [vaultTokenPda] = getVaultTokenPda(poolPda, program.programId);

  return program.methods
    .collectFeesSpl()
    .accounts({
      payer,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      vaultTokenAccount: vaultTokenPda,
      platformTreasuryToken: platformTreasuryTokenAccount,
      creatorTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// ---------- Claim payout ----------

export async function claimPayoutNative(
  program: any,
  user: PublicKey,
  poolPda: PublicKey
): Promise<string> {
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [stakePda] = getStakePda(poolPda, user, program.programId);

  return program.methods
    .claimPayoutNative()
    .accounts({
      user,
      pool: poolPda,
      vaultAuthority: vaultPda,
      stake: stakePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function claimPayoutSpl(
  program: any,
  user: PublicKey,
  poolPda: PublicKey,
  userTokenAccount: PublicKey
): Promise<string> {
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [vaultTokenPda] = getVaultTokenPda(poolPda, program.programId);
  const [stakePda] = getStakePda(poolPda, user, program.programId);

  return program.methods
    .claimPayoutSpl()
    .accounts({
      user,
      pool: poolPda,
      vaultAuthority: vaultPda,
      vaultTokenAccount: vaultTokenPda,
      userTokenAccount,
      stake: stakePda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// ---------- Reads, for building the UI ----------

export async function fetchPool(
  program: any,
  poolPda: PublicKey
): Promise<PoolDisplay> {
  const raw = (await program.account.pool.fetch(poolPda)) as PoolAccount;
  return toPoolDisplay(raw);
}

export async function fetchStake(
  program: any,
  poolPda: PublicKey,
  user: PublicKey
): Promise<StakeAccount | null> {
  const [stakePda] = getStakePda(poolPda, user, program.programId);
  try {
    return (await program.account.stake.fetch(stakePda)) as StakeAccount;
  } catch {
    // Account doesn't exist yet, meaning this user hasn't staked on this pool.
    return null;
  }
}

/** Lists every pool created on-chain, newest first, for a feed/list screen. */
export async function fetchAllPools(program: any): Promise<PoolDisplay[]> {
  const all = (await program.account.pool.all()) as { account: PoolAccount }[];
  return all.map((entry) => toPoolDisplay(entry.account));
}

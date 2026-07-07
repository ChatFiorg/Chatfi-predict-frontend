import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  getConfigPda,
  getPoolPda,
  getVaultPda,
  getVaultTokenPda,
  getStakePda,
} from "./pda";
import { PoolAccount, StakeAccount, ConfigAccount, toPoolDisplay, PoolDisplay } from "./types";

/**
 * `program` is the Anchor Program instance for chatfi-predict, already
 * wired to the user's connection + wallet inside ChatFI's provider.
 * All functions here return the transaction signature (string) on success.
 */

// ---------- One-time setup ----------

export async function initializeConfig(
  program: any,
  authority: PublicKey,
  platformTreasury: PublicKey,
  poolCreationFeeLamports: number | BN,
  disputeBondLamports: number | BN,
  disputeWindowSecs: number
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  return program.methods
    .initializeConfig(
      platformTreasury,
      new BN(poolCreationFeeLamports),
      new BN(disputeBondLamports),
      new BN(disputeWindowSecs)
    )
    .accounts({
      authority,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function updatePoolCreationFee(
  program: any,
  authority: PublicKey,
  newFeeLamports: number | BN
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  return program.methods
    .updatePoolCreationFee(new BN(newFeeLamports))
    .accounts({ config: configPda, authority })
    .rpc();
}

export async function updateDisputeSettings(
  program: any,
  authority: PublicKey,
  newBondLamports: number | BN,
  newWindowSecs: number
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  return program.methods
    .updateDisputeSettings(new BN(newBondLamports), new BN(newWindowSecs))
    .accounts({ config: configPda, authority })
    .rpc();
}

export async function fetchConfig(program: any): Promise<ConfigAccount> {
  const [configPda] = getConfigPda(program.programId);
  return (await program.account.config.fetch(configPda)) as ConfigAccount;
}

// ---------- Create pool ----------

export interface CreatePoolParams {
  creator: PublicKey;
  admin: PublicKey;
  question: string;
  /** 2 to 8 outcome labels, e.g. ["Yes", "No"] or ["Tinubu", "Obi", "Atiku"]. */
  outcomeNames: string[];
  /** Unix seconds. Betting closes at this time. */
  closeTs: number;
  /** Unix seconds. Must be >= closeTs + 60. Earliest time resolution can be proposed. */
  resolveTs: number;
}

export async function createPoolNative(
  program: any,
  params: CreatePoolParams
): Promise<{ signature: string; poolPda: PublicKey }> {
  if (params.outcomeNames.length < 2 || params.outcomeNames.length > 8) {
    throw new Error("A pool needs between 2 and 8 outcomes.");
  }

  const [poolPda] = getPoolPda(params.creator, params.question, program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);
  const [configPda] = getConfigPda(program.programId);
  const config = await fetchConfig(program);

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
      config: configPda,
      platformTreasury: config.platformTreasury,
      pool: poolPda,
      vaultAuthority: vaultPda,
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
  outcome: number,
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

// ---------- Dispute-based resolution flow ----------

/** Anyone can propose an outcome once resolve_ts has passed. Requires a bond. */
export async function proposeResolution(
  program: any,
  proposer: PublicKey,
  poolPda: PublicKey,
  proposedOutcome: number
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);

  return program.methods
    .proposeResolution(proposedOutcome)
    .accounts({
      proposer,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Anyone except the proposer can dispute within the window. Requires a matching bond. */
export async function disputeResolution(
  program: any,
  disputer: PublicKey,
  poolPda: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);

  return program.methods
    .disputeResolution()
    .accounts({
      disputer,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Permissionless: finalizes an uncontested proposal once the window has passed. */
export async function finalizeResolution(
  program: any,
  payer: PublicKey,
  poolPda: PublicKey,
  proposerWallet: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);

  return program.methods
    .finalizeResolution()
    .accounts({
      payer,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      proposerWallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Admin-only tiebreaker for a disputed pool. Winner takes both bonds. */
export async function adminResolveDispute(
  program: any,
  admin: PublicKey,
  poolPda: PublicKey,
  finalOutcome: number,
  proposerWallet: PublicKey,
  disputerWallet: PublicKey
): Promise<string> {
  const [configPda] = getConfigPda(program.programId);
  const [vaultPda] = getVaultPda(poolPda, program.programId);

  return program.methods
    .adminResolveDispute(finalOutcome)
    .accounts({
      admin,
      config: configPda,
      pool: poolPda,
      vaultAuthority: vaultPda,
      proposerWallet,
      disputerWallet,
      systemProgram: SystemProgram.programId,
    })
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
  const config = await fetchConfig(program);

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

// ---------- Reads, for building the UI ----------

export async function fetchPool(program: any, poolPda: PublicKey): Promise<PoolDisplay> {
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
    return null;
  }
}

/** Lists every pool created on-chain, newest first, for a feed/list screen. */
export async function fetchAllPools(
  program: any
): Promise<{ pda: PublicKey; display: PoolDisplay }[]> {
  const all = (await program.account.pool.all()) as {
    publicKey: PublicKey;
    account: PoolAccount;
  }[];
  return all.map((entry) => ({
    pda: entry.publicKey,
    display: toPoolDisplay(entry.account),
  }));
}

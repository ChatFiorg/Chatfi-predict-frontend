import { PublicKey } from "@solana/web3.js";

/**
 * All PDA seeds must exactly match the constants in the Anchor program's
 * constants.rs. If the program's seeds ever change, update here too.
 */
const CONFIG_SEED = Buffer.from("config_v2");
const POOL_SEED = Buffer.from("pool");
const VAULT_SEED = Buffer.from("vault");
const VAULT_TOKEN_SEED = Buffer.from("vault_token");
const STAKE_SEED = Buffer.from("stake");

export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function getPoolPda(
  creator: PublicKey,
  question: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, creator.toBuffer(), Buffer.from(question)],
    programId
  );
}

export function getVaultPda(pool: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED, pool.toBuffer()], programId);
}

export function getVaultTokenPda(pool: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_TOKEN_SEED, pool.toBuffer()], programId);
}

export function getStakePda(
  pool: PublicKey,
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([STAKE_SEED, pool.toBuffer(), user.toBuffer()], programId);
}

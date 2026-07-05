/**
 * Flip this to false once you've deployed the program and have a real
 * program ID + IDL. Demo mode uses mock pool data so the UI can be built
 * and reviewed before the program is wired in.
 */
export const DEMO_MODE = false;

/**
 * After deploying (via Solana Playground's Deploy button, or anchor deploy),
 * replace this with your real program ID from `declare_id!` / Anchor.toml.
 */
export const PROGRAM_ID = "BV4HTjLb3AxFqtkRFGk4joTN8xSDkuMJCSLEL2qcLJxZ";

/**
 * Export the IDL from Solana Playground (Export IDL, in the Build panel's
 * menu, or under target/idl/prediction_market.json after `anchor build`)
 * and drop it in at src/idl/prediction_market.json, then set DEMO_MODE
 * to false above.
 */

import { FC, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";

import { Header } from "./components/Header";
import { Ticker } from "./components/Ticker";
import { Hero } from "./components/Hero";
import { PoolFeed } from "./components/PoolFeed";
import { CreatePoolModal, NewPoolInput } from "./components/CreatePoolModal";
import { DEMO_MODE } from "./config";
import { DEMO_POOLS } from "./mockData";
import {
  createPoolNative,
  placeStakeNative,
  proposeResolution,
  disputeResolution,
  finalizeResolution,
  adminResolveDispute,
  claimPayoutNative,
  fetchAllPools,
  fetchConfig,
} from "./lib/chatfi-predict-client";
import idl from "./idl/prediction_market.json";

export const App: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [pools, setPools] = useState(DEMO_MODE ? DEMO_POOLS : []);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPools, setLoadingPools] = useState(!DEMO_MODE);
  const [creationFeeSol, setCreationFeeSol] = useState<number | undefined>(undefined);

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  function getProgram(): any | null {
    if (DEMO_MODE) return null;
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {});
    return new Program(idl as any, provider);
  }

  async function refreshPools(program: any) {
    setLoadingPools(true);
    try {
      const fetched = await fetchAllPools(program);
      setPools(fetched);
    } catch (e) {
      console.error("Failed to fetch pools:", e);
      flashToast("Could not load pools from chain, see console for details.");
    } finally {
      setLoadingPools(false);
    }
  }

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!wallet.publicKey || !wallet.signTransaction) {
      setLoadingPools(false);
      return;
    }
    const program = getProgram();
    if (!program) return;

    refreshPools(program);
    fetchConfig(program)
      .then((config) => setCreationFeeSol(config.poolCreationFeeLamports.toNumber() / 1e9))
      .catch(() => {
        // Config not initialized yet on this program; not fatal for browsing.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  function requireWallet(): PublicKey | null {
    if (!wallet.publicKey) {
      setVisible(true);
      return null;
    }
    return wallet.publicKey;
  }

  // ---------- Create pool ----------

  async function handleCreatePool(input: NewPoolInput) {
    const me = requireWallet();
    if (!me) throw new Error("Connect your wallet first.");

    const now = Math.floor(Date.now() / 1000);
    const closeTs = now + Math.round(input.hoursUntilClose * 3600);
    const resolveTs = closeTs + 300;

    if (DEMO_MODE) {
      const fakePda = new PublicKey(
        Uint8Array.from(
          Array.from(input.question).reduce((bytes, ch, i) => {
            bytes[i % 32] ^= ch.charCodeAt(0);
            return bytes;
          }, new Array(32).fill(0))
        )
      );
      setPools((prev) => [
        {
          pda: fakePda,
          display: {
            question: input.question,
            outcomeNames: input.outcomeNames,
            outcomeCount: input.outcomeNames.length,
            isNativeSol: true,
            tokenMint: null,
            totalStakedRaw: new BN(0),
            stakePerOutcomeRaw: input.outcomeNames.map(() => new BN(0)),
            oddsPercent: input.outcomeNames.map(() => Math.round(100 / input.outcomeNames.length)),
            closeTs,
            resolveTs,
            status: "open",
            winningOutcome: null,
            feesCollected: false,
            proposedOutcome: null,
            proposer: null,
            disputeDeadline: null,
            disputer: null,
            admin: me,
            creator: me,
          },
        },
        ...prev,
      ]);
      flashToast("Pool created (demo mode, not on-chain yet).");
      return;
    }

    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");

    await createPoolNative(program, {
      creator: me,
      admin: me,
      question: input.question,
      outcomeNames: input.outcomeNames,
      closeTs,
      resolveTs,
    });
    flashToast("Pool created onchain.");
    await refreshPools(program);
  }

  // ---------- Stake ----------

  async function handleStake(poolPda: PublicKey, outcome: number, amount: number) {
    const me = requireWallet();
    if (!me) return;

    if (DEMO_MODE) {
      setPools((prev) =>
        prev.map((p) => {
          if (!p.pda.equals(poolPda)) return p;
          const addedLamports = Math.round(amount * 1e9);
          const newStakes = [...p.display.stakePerOutcomeRaw];
          newStakes[outcome] = newStakes[outcome].add(new BN(addedLamports));
          const newTotal = newStakes.reduce((sum, s) => sum + s.toNumber(), 0);
          const newOdds = newStakes.map((s) =>
            newTotal === 0 ? Math.round(100 / newStakes.length) : Math.round((s.toNumber() / newTotal) * 100)
          );
          return {
            ...p,
            display: { ...p.display, stakePerOutcomeRaw: newStakes, oddsPercent: newOdds },
          };
        })
      );
      flashToast(`Staked ${amount} SOL (demo mode, not on-chain yet).`);
      return;
    }

    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");

    await placeStakeNative(program, me, poolPda, outcome, Math.round(amount * 1e9));
    flashToast("Stake placed onchain.");
    await refreshPools(program);
  }

  // ---------- Dispute flow ----------

  async function handlePropose(poolPda: PublicKey, outcome: number) {
    const me = requireWallet();
    if (!me) return;
    if (DEMO_MODE) {
      flashToast("Propose is not simulated in demo mode.");
      return;
    }
    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");
    await proposeResolution(program, me, poolPda, outcome);
    flashToast("Result proposed. Dispute window is now open.");
    await refreshPools(program);
  }

  async function handleDispute(poolPda: PublicKey) {
    const me = requireWallet();
    if (!me) return;
    if (DEMO_MODE) {
      flashToast("Dispute is not simulated in demo mode.");
      return;
    }
    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");
    await disputeResolution(program, me, poolPda);
    flashToast("Disputed. Awaiting admin decision.");
    await refreshPools(program);
  }

  async function handleFinalize(poolPda: PublicKey) {
    const me = requireWallet();
    if (!me) return;
    if (DEMO_MODE) {
      flashToast("Finalize is not simulated in demo mode.");
      return;
    }
    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");
    const poolEntry = pools.find((p) => p.pda.equals(poolPda));
    if (!poolEntry?.display.proposer) throw new Error("No proposer recorded for this pool.");
    await finalizeResolution(program, me, poolPda, poolEntry.display.proposer);
    flashToast("Resolution finalized.");
    await refreshPools(program);
  }

  async function handleAdminResolve(poolPda: PublicKey, outcome: number) {
    const me = requireWallet();
    if (!me) return;
    if (DEMO_MODE) {
      flashToast("Admin resolve is not simulated in demo mode.");
      return;
    }
    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");
    const poolEntry = pools.find((p) => p.pda.equals(poolPda));
    if (!poolEntry?.display.proposer || !poolEntry?.display.disputer) {
      throw new Error("Missing proposer or disputer for this pool.");
    }
    await adminResolveDispute(program, me, poolPda, outcome, poolEntry.display.proposer, poolEntry.display.disputer);
    flashToast("Dispute resolved by admin.");
    await refreshPools(program);
  }

  async function handleClaim(poolPda: PublicKey) {
    const me = requireWallet();
    if (!me) return;
    if (DEMO_MODE) {
      flashToast("Claim is not simulated in demo mode.");
      return;
    }
    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");
    await claimPayoutNative(program, me, poolPda);
    flashToast("Payout claimed.");
    await refreshPools(program);
  }

  return (
    <>
      <Header />
      <Ticker pools={pools.map((p) => p.display)} />
      <Hero onCreateClick={() => setShowCreate(true)} />

      {!DEMO_MODE && loadingPools && (
        <div
          className="container"
          style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          Loading pools from devnet...
        </div>
      )}
      {!DEMO_MODE && !loadingPools && !wallet.publicKey && (
        <div
          className="container"
          style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          Connect your wallet to view live pools.
        </div>
      )}
      {(DEMO_MODE || wallet.publicKey) && !loadingPools && (
        <PoolFeed
          pools={pools}
          currentWallet={wallet.publicKey}
          onStake={handleStake}
          onPropose={handlePropose}
          onDispute={handleDispute}
          onFinalize={handleFinalize}
          onAdminResolve={handleAdminResolve}
          onClaim={handleClaim}
        />
      )}

      {showCreate && (
        <CreatePoolModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreatePool}
          creationFeeSol={creationFeeSol}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface-raised)",
            border: "1px solid var(--lime)",
            color: "var(--ink)",
            padding: "12px 20px",
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            zIndex: 100,
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}

      {DEMO_MODE && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            background: "var(--coral)",
            color: "#0a0b08",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 3,
            zIndex: 100,
          }}
        >
          DEMO MODE
        </div>
      )}
    </>
  );
};

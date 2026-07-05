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
import { DEMO_MODE, PROGRAM_ID } from "./config";
import { DEMO_POOLS } from "./mockData";
import { createPoolNative, placeStakeNative, fetchAllPools } from "./lib/chatfi-predict-client";

import idl from "./idl/prediction_market.json";

export const App: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [pools, setPools] = useState(DEMO_MODE ? DEMO_POOLS : []);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPools, setLoadingPools] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!wallet.publicKey || !wallet.signTransaction) {
      setLoadingPools(false);
      return;
    }
    const provider = new AnchorProvider(connection, wallet as any, {});
    const program = new Program(idl as any, provider);
    setLoadingPools(true);
    fetchAllPools(program)
      .then((fetched) => setPools(fetched))
      .catch((e) => {
        console.error("Failed to fetch pools:", e);
        flashToast("Could not load pools from chain, see console for details.");
      })
      .finally(() => setLoadingPools(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

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

  async function handleCreatePool(input: NewPoolInput) {
    if (!wallet.publicKey) {
      setVisible(true);
      throw new Error("Connect your wallet first.");
    }

    const now = Math.floor(Date.now() / 1000);
    const closeTs = now + Math.round(input.hoursUntilClose * 3600);
    const resolveTs = closeTs + 300;

    if (DEMO_MODE) {
      // Demo mode: add it straight to local state so the UI can be reviewed
      // without a deployed program.
      const fakePda = new PublicKey(
        Uint8Array.from(
          Array.from(input.question).reduce(
            (bytes, ch, i) => {
              bytes[i % 32] ^= ch.charCodeAt(0);
              return bytes;
            },
            new Array(32).fill(0)
          )
        )
      );
      setPools((prev) => [
        {
          pda: fakePda,
          display: {
            question: input.question,
            outcomeNames: [input.yesLabel, input.noLabel],
            isNativeSol: true,
            tokenMint: null,
            totalStakedRaw: new BN(0),
            stakePerOutcomeRaw: [
              new BN(0),
              new BN(0),
            ],
            oddsPercent: [50, 50],
            closeTs,
            resolveTs,
            status: "open",
            winningOutcome: null,
            feesCollected: false,
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
      creator: wallet.publicKey,
      admin: wallet.publicKey,
      question: input.question,
      outcomeNames: [input.yesLabel, input.noLabel],
      closeTs,
      resolveTs,
    });
    flashToast("Pool created onchain.");
  }

  async function handleStake(poolPda: PublicKey, outcome: 0 | 1, amount: number) {
    if (!wallet.publicKey) {
      setVisible(true);
      return;
    }

    if (DEMO_MODE) {
      setPools((prev) =>
        prev.map((p) => {
          if (!p.pda.equals(poolPda)) return p;
          const totalBefore =
            p.display.stakePerOutcomeRaw[0].toNumber() +
            p.display.stakePerOutcomeRaw[1].toNumber();
          const addedLamports = Math.round(amount * 1e9);
          const newTotal = totalBefore + addedLamports;
          const newYes =
            outcome === 0
              ? p.display.stakePerOutcomeRaw[0].toNumber() + addedLamports
              : p.display.stakePerOutcomeRaw[0].toNumber();
          const newNo =
            outcome === 1
              ? p.display.stakePerOutcomeRaw[1].toNumber() + addedLamports
              : p.display.stakePerOutcomeRaw[1].toNumber();
          return {
            ...p,
            display: {
              ...p.display,
              oddsPercent:
                newTotal === 0
                  ? [50, 50]
                  : [
                      Math.round((newYes / newTotal) * 100),
                      Math.round((newNo / newTotal) * 100),
                    ],
            },
          };
        })
      );
      flashToast(`Staked ${amount} SOL (demo mode, not on-chain yet).`);
      return;
    }

    const program = getProgram();
    if (!program) throw new Error("Program not configured yet.");

    await placeStakeNative(program, wallet.publicKey, poolPda, outcome, Math.round(amount * 1e9));
    flashToast("Stake placed onchain.");
  }

  return (
    <>
      <Header />
      <Ticker pools={pools.map((p) => p.display)} />
      <Hero onCreateClick={() => setShowCreate(true)} />
      {!DEMO_MODE && loadingPools && (
        <div className="container" style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Loading pools from devnet...
        </div>
      )}
      {!DEMO_MODE && !loadingPools && !wallet.publicKey && (
        <div className="container" style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Connect your wallet to view live pools.
        </div>
      )}
      {(DEMO_MODE || wallet.publicKey) && !loadingPools && (
        <PoolFeed pools={pools} onStake={handleStake} />
      )}

      {showCreate && (
        <CreatePoolModal onClose={() => setShowCreate(false)} onSubmit={handleCreatePool} />
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

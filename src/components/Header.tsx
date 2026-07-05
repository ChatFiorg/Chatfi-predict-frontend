import { FC } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

function shortAddress(addr: string) {
  return addr.slice(0, 4) + ".." + addr.slice(-4);
}

export const Header: FC = () => {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <header className="header container">
      <div className="brand">
        <span className="brand-mark">
          Chat<span>FI</span> Predict
        </span>
        <span className="brand-sub">Naija onchain markets</span>
      </div>

      {publicKey ? (
        <button className="wallet-btn connected" onClick={() => disconnect()}>
          {shortAddress(publicKey.toBase58())}
        </button>
      ) : (
        <button className="wallet-btn" onClick={() => setVisible(true)}>
          Connect wallet
        </button>
      )}
    </header>
  );
};

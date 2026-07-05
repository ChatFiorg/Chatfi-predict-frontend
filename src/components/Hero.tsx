import { FC } from "react";

export const Hero: FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  return (
    <section className="hero container">
      <h1>
        Stake on what
        <br />
        <span className="lime">actually happens.</span>
      </h1>
      <p>
        Onchain prediction pools for Naija events, politics, weather, gist, and
        everything in between. Fully non-custodial. Trade Yes or No on any
        question with SOL or USDC.
      </p>
      <div className="hero-actions">
        <button className="btn-primary" onClick={onCreateClick}>
          + Create a pool
        </button>
        <a href="#pools" className="btn-secondary" style={{ textDecoration: "none" }}>
          Browse live pools
        </a>
      </div>
    </section>
  );
};

import { FC } from "react";
import { PoolDisplay } from "../lib/chatfi-predict-client";

export const Ticker: FC<{ pools: PoolDisplay[] }> = ({ pools }) => {
  const live = pools.filter((p) => p.status === "open");
  if (live.length === 0) return null;

  // Duplicate the list so the CSS scroll loop has no visible seam.
  const items = [...live, ...live];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((p, i) => (
          <span key={i}>
            <span className="lime">{p.oddsPercent[0]}%</span> {p.question}
          </span>
        ))}
      </div>
    </div>
  );
};

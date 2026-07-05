# chatfi-predict-web

Web UI for ChatFI's onchain prediction markets. Built to validate the
design and flow before porting into the ChatFI mobile app (Rchatfi).

## Design

Dark background, lime/coral two-tone for Yes/No, pool cards styled as
torn betting-coupon stubs (a nod to Nigeria's long-running football pools
betting culture) with a stamped status badge (Live / Closed / Settled),
Anton for display type, Space Mono for odds/data, Inter for body text.

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. Works fully in **demo mode** out of the
box — no wallet, no deployed program needed, just to review the UI/UX.

## Going from demo to real onchain data

1. Deploy `chatfi-predict` (Solana Playground's Deploy button, or
   `anchor deploy`) and note the resulting program ID.
2. Export the IDL (Playground's Export IDL option, or copy
   `target/idl/prediction_market.json` after `anchor build`) into
   `src/idl/prediction_market.json`.
3. In `src/config.ts`:
   - Set `PROGRAM_ID` to your real deployed program ID.
   - Set `DEMO_MODE = false`.
4. In `src/App.tsx`, uncomment the `import idl from "./idl/prediction_market.json"`
   line and the `return new Program(idl as any, provider);` line inside
   `getProgram()`.
5. Restart `npm run dev`. The app will now read real pools via
   `fetchAllPools` and send real transactions through the connected wallet
   (Phantom, on devnet by default — change the cluster in
   `src/components/WalletProvider.tsx` when ready for mainnet).

## Structure

```
src/
  App.tsx                 orchestration: demo/real mode switch, handlers
  config.ts                DEMO_MODE + PROGRAM_ID toggle
  mockData.ts               demo pool data
  styles.css                 all design tokens and component styles
  components/
    Header.tsx               brand + wallet connect button
    Ticker.tsx                scrolling live-odds ticker
    Hero.tsx                  headline + create/browse CTAs
    PoolFeed.tsx              grid layout + empty state
    PoolCard.tsx              coupon-styled pool card, inline stake flow
    CreatePoolModal.tsx        new pool form
    WalletProvider.tsx        Solana wallet adapter setup (Phantom, devnet)
  lib/chatfi-predict-client/  the on-chain action functions (from earlier)
```

## Known gaps / next steps

- Only native SOL pools are wired into the UI flow (`placeStakeNative`,
  `createPoolNative`). USDC/SPL pools need a token account picker added
  to `CreatePoolModal` and `PoolCard` before they're usable end to end.
- No resolve/claim screens yet — those are admin-only and winner-only
  actions respectively, better suited to a separate view once the create
  + stake flow is validated.
- `fetchAllPools` (in the client library) does a full account scan; fine
  for a demo, but add filtering once there are many pools on mainnet.
- The wallet adapter is set to devnet and Phantom-only for now; add more
  adapters (Solflare, Backpack) and a mainnet toggle before shipping.

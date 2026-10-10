# TuneGate

TuneGate is a small music-unlock dApp for Monad testnet. The contract stores track titles, MON prices, artist payout addresses, and fan access. Three short, original audio samples live in the frontend's `public/audio` folder; no audio is uploaded to a server.

## How it works

- `addTrack(title, price)` lets any artist list a track. The caller becomes its artist, and the price is entered in wei (the frontend displays MON).
- The constructor creates three sample tracks for the wallet that deploys the contract.
- `unlock(trackId)` accepts exactly the listed price, marks the caller as having access, pays the artist, and emits `TrackUnlocked`.
- The frontend reads the contract on Monad testnet. It shows its audio player only when the connected wallet's on-chain access flag is true.

Monad charges transaction fees based on the gas limit, so the frontend estimates the unlock gas and adds only a 10% buffer.

## Deploy on Monad testnet (Windows PowerShell)

Use a **new test-only wallet** with testnet MON. Never put a recovery phrase in this project. The deployer private key goes only in the ignored root `.env` file; do not commit it or share it.

1. From this folder, install contract dependencies and create your local secrets file:

   ```powershell
   cd contracts
   npm install
   Copy-Item ..\.env.example ..\.env
   notepad ..\.env
   ```

   Replace `YOUR_TEST_WALLET_PRIVATE_KEY` with the private key for that new test-only wallet. Leave the RPC URL as-is unless you have another Monad testnet RPC.

2. Compile and run the contract tests:

   ```powershell
   npm run compile
   npm test
   ```

3. Deploy the contract:

   ```powershell
   npm run deploy -- --network monadTestnet
   ```

   Copy the printed contract address. The wallet needs Monad testnet MON for deployment and gas. Newly received test MON can take a short moment to become spendable on Monad.

4. Configure and start the frontend:

   ```powershell
   Set-Content ..\web\.env.local "VITE_CONTRACT_ADDRESS=PASTE_DEPLOYED_ADDRESS_HERE"
   cd ..\web
   npm install
   npm run dev
   ```

   Open the local URL printed by Vite. Connect a browser wallet on Monad testnet. Unlock payments are in MON, and a confirmed purchase links to Monad's testnet explorer.

## Useful contract commands

Run `npm run compile` and `npm test` from `contracts/`. After deployment, the contract address is also shown in the deployment output. To deploy again, run the same deploy command; the frontend must then be pointed at the new address.

import React, { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";
import { ArrowUpRight, AudioLines, Check, Disc3, Headphones, LockKeyhole, Wallet } from "lucide-react";
import { CONTRACT_ADDRESS, EXPLORER_TX_URL, MONAD_TESTNET, fetchTracks, sampleTracks, tuneGateAbi } from "./contract.js";

const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export default function App() {
  const [tracks, setTracks] = useState(sampleTracks);
  const [account, setAccount] = useState("");
  const [access, setAccess] = useState({});
  const [busyTrack, setBusyTrack] = useState(null);
  const [notice, setNotice] = useState("");
  const [transactionUrl, setTransactionUrl] = useState("");
  const [loadError, setLoadError] = useState("");

  const refreshTracks = useCallback(async () => {
    try {
      const nextTracks = await fetchTracks();
      setTracks(nextTracks);
      setLoadError("");
    } catch {
      setLoadError("Could not read TuneGate on Monad testnet. Check the contract address and RPC connection.");
    }
  }, []);

  const refreshAccess = useCallback(async (address) => {
    if (!CONTRACT_ADDRESS || !address) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, tuneGateAbi, new BrowserProvider(window.ethereum));
      const results = await Promise.all(tracks.map((track) => contract.hasAccess(address, track.id)));
      setAccess(Object.fromEntries(tracks.map((track, index) => [track.id, results[index]])));
    } catch {
      setAccess({});
    }
  }, [tracks]);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const onAccountsChanged = (accounts) => {
      const nextAccount = accounts[0] || "";
      setAccount(nextAccount);
      setAccess({});
      if (nextAccount) refreshAccess(nextAccount);
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", onAccountsChanged);
  }, [refreshAccess]);

  useEffect(() => {
    if (account) refreshAccess(account);
  }, [account, refreshAccess]);

  async function connectWallet() {
    if (!window.ethereum) {
      setNotice("Install a browser wallet such as MetaMask to connect.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== MONAD_TESTNET.chainIdHex) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: MONAD_TESTNET.chainIdHex }] });
        } catch (error) {
          if (error.code !== 4902) throw error;
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [MONAD_TESTNET] });
        }
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());
      setNotice("");
    } catch (error) {
      setNotice(error.shortMessage || error.message || "Wallet connection was cancelled.");
    }
  }

  async function unlockTrack(track) {
    if (!window.ethereum || !CONTRACT_ADDRESS) return;
    setBusyTrack(track.id);
    setNotice("Confirm the unlock in your wallet...");
    setTransactionUrl("");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, tuneGateAbi, signer);
      const estimate = await contract.unlock.estimateGas(track.id, { value: track.price });
      const transaction = await contract.unlock(track.id, {
        value: track.price,
        gasLimit: estimate + estimate / 10n,
      });
      setTransactionUrl(`${EXPLORER_TX_URL}${transaction.hash}`);
      setNotice("Payment sent. Waiting for confirmation...");
      await transaction.wait();
      setAccess((current) => ({ ...current, [track.id]: true }));
      setNotice("Unlocked. This track is yours to play.");
    } catch (error) {
      setNotice(error.shortMessage || error.reason || error.message || "The unlock did not complete.");
    } finally {
      setBusyTrack(null);
    }
  }

  const unlockedCount = tracks.filter((track) => access[track.id]).length;

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="TuneGate home">
          <span className="brand-mark"><AudioLines size={18} strokeWidth={2.5} /></span>
          <span>tune<span className="wordmark-light">gate</span></span>
        </a>
        <div className="topbar-right">
          <span className="network-pill"><span className="network-dot" /> MONAD TESTNET</span>
          <button className="connect-button" onClick={connectWallet}>
            {account ? <Check size={16} /> : <Wallet size={16} />}
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow"><span>INDEPENDENT SOUND</span><span className="eyebrow-line" /></p>
          <h1>Hear it.<br /><em>Own access.</em></h1>
          <p className="intro-description">A small room for new music. Unlock a track once, pay the artist directly, keep listening.</p>
          <div className="intro-foot"><Disc3 size={17} /><span>3 tracks to get lost in</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-ring ring-one" />
          <div className="hero-ring ring-two" />
          <div className="hero-disc"><div className="disc-groove groove-one" /><div className="disc-groove groove-two" /><div className="disc-label"><AudioLines size={28} /></div></div>
          <div className="hero-sticker">SIDE A<br /><span>MONAD / 01</span></div>
          <div className="hero-caption">LISTEN<br />CLOSER</div>
        </div>
      </section>

      <section className="collection" aria-labelledby="collection-heading">
        <div className="section-heading">
          <div><p className="eyebrow">THE LISTENING ROOM</p><h2 id="collection-heading">Fresh cuts <span>／</span> 01</h2></div>
          <div className="collection-count"><Headphones size={17} /><span>{String(unlockedCount).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")} UNLOCKED</span></div>
        </div>

        {loadError && <div className="notice notice-error" role="status">{loadError}</div>}
        {!CONTRACT_ADDRESS && <div className="notice" role="status">Deploy the contract and set <code>VITE_CONTRACT_ADDRESS</code> to enable on-chain unlocks.</div>}

        <div className="track-grid">
          {tracks.map((track, index) => {
            const hasTrackAccess = Boolean(access[track.id]);
            const isBusy = busyTrack === track.id;
            return (
              <article className={`track-card art-${track.color}`} key={track.id} style={{ "--card-order": index }}>
                <div className="cover-art">
                  <div className="cover-number">TG—0{index + 1}</div>
                  <div className="cover-orbit orbit-a" /><div className="cover-orbit orbit-b" />
                  <div className="cover-shape"><AudioLines size={34} strokeWidth={1.4} /></div>
                  <span className="cover-mood">{track.mood}</span>
                  {hasTrackAccess && <span className="cover-owned"><Check size={13} /> IN YOUR LIBRARY</span>}
                </div>
                <div className="track-info">
                  <div className="track-title-row"><div><p className="track-kicker">TUNEGATE SELECTS</p><h3>{track.title}</h3></div><span className="track-index">0{index + 1}</span></div>
                  <div className="track-meta"><span>{track.artist ? `ARTIST ${shortAddress(track.artist)}` : "INDEPENDENT ARTIST"}</span><span className="price">{formatEther(track.price)} <small>MON</small></span></div>
                  {hasTrackAccess ? (
                    <div className="player-wrap"><audio controls preload="none" src={track.audio}>Your browser does not support audio playback.</audio></div>
                  ) : (
                    <button
                      className="unlock-button"
                      disabled={!account || !CONTRACT_ADDRESS || isBusy}
                      onClick={() => unlockTrack(track)}
                    >
                      <span>{isBusy ? "Unlocking..." : "Unlock track"}</span>
                      <span className="unlock-action">{account && CONTRACT_ADDRESS ? <LockKeyhole size={16} /> : <ArrowUpRight size={16} />}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {(notice || transactionUrl) && <div className="status-bar" role="status">
        <span>{notice}</span>
        {transactionUrl && <a href={transactionUrl} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={14} /></a>}
      </div>}

      <footer className="footer"><span>GOOD MUSIC. DIRECT LINES.</span><span>BUILT ON <strong>MONAD</strong></span></footer>
    </main>
  );
}

import { Contract, JsonRpcProvider, parseEther } from "ethers";

export const MONAD_TESTNET = {
  chainId: 10143,
  chainIdHex: "0x279f",
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadscan.com"],
};

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const EXPLORER_TX_URL = "https://testnet.monadscan.com/tx/";
export const readProvider = new JsonRpcProvider(MONAD_TESTNET.rpcUrls[0], {
  chainId: MONAD_TESTNET.chainId,
  name: "Monad Testnet",
});

export const tuneGateAbi = [
  "function trackCount() view returns (uint256)",
  "function getTrack(uint256 trackId) view returns (uint256 id, string title, uint256 price, address artist)",
  "function hasAccess(address fan, uint256 trackId) view returns (bool)",
  "function unlock(uint256 trackId) payable",   
];

export const sampleTracks = [
  { id: 0, title: "Monad Morning", price: parseEther("0.01"), audio: "/audio/monad-morning.mp3", mood: "FIRST LIGHT", color: "lime" },
  { id: 1, title: "Glasswater", price: parseEther("0.02"), audio: "/audio/glasswater.mp3", mood: "SLOW CURRENT", color: "blue" },
  { id: 2, title: "Afterimage", price: parseEther("0.03"), audio: "/audio/afterimage.wav", mood: "LAST GLOW", color: "coral" },
];

export async function fetchTracks() {
  if (!CONTRACT_ADDRESS) return sampleTracks;
  const contract = new Contract(CONTRACT_ADDRESS, tuneGateAbi, readProvider);
  const count = Number(await contract.trackCount());
  return Promise.all(Array.from({ length: count }, async (_, id) => {
    const track = await contract.getTrack(id);
    const sample = sampleTracks[id % sampleTracks.length];
    return {
      id,
      title: track.title,
      price: track.price,
      artist: track.artist,
      audio: sample.audio,
      mood: sample.mood,
      color: sample.color,
    };
  }));
}

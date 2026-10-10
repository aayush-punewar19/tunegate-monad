const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TuneGate", function () {
  async function deployTuneGate() {
    const [artist, fan, anotherArtist] = await ethers.getSigners();
    const TuneGate = await ethers.getContractFactory("TuneGate", artist);
    const tuneGate = await TuneGate.deploy();
    await tuneGate.waitForDeployment();
    return { tuneGate, artist, fan, anotherArtist };
  }

  it("starts with three tracks owned by the deployer", async function () {
    const { tuneGate, artist } = await deployTuneGate();

    expect(await tuneGate.trackCount()).to.equal(3n);
    const firstTrack = await tuneGate.getTrack(0);
    expect(firstTrack.title).to.equal("Monad Morning");
    expect(firstTrack.price).to.equal(ethers.parseEther("0.01"));
    expect(firstTrack.artist).to.equal(artist.address);
  });

  it("lets an artist add a track with their wallet as payout address", async function () {
    const { tuneGate, anotherArtist } = await deployTuneGate();

    await tuneGate.connect(anotherArtist).addTrack("New song", ethers.parseEther("0.05"));

    const track = await tuneGate.getTrack(3);
    expect(track.title).to.equal("New song");
    expect(track.price).to.equal(ethers.parseEther("0.05"));
    expect(track.artist).to.equal(anotherArtist.address);
  });

  it("pays the artist and grants access for the exact price", async function () {
    const { tuneGate, artist, fan } = await deployTuneGate();
    const price = ethers.parseEther("0.01");
    const artistBalanceBefore = await ethers.provider.getBalance(artist.address);

    await expect(tuneGate.connect(fan).unlock(0, { value: price }))
      .to.emit(tuneGate, "TrackUnlocked")
      .withArgs(0, fan.address, artist.address, price);

    expect(await tuneGate.hasAccess(fan.address, 0)).to.equal(true);
    expect(await ethers.provider.getBalance(artist.address)).to.equal(artistBalanceBefore + price);
  });

  it("rejects incorrect payment and repeat unlocks", async function () {
    const { tuneGate, fan } = await deployTuneGate();
    const price = ethers.parseEther("0.01");

    await expect(tuneGate.connect(fan).unlock(0, { value: price - 1n }))
      .to.be.revertedWith("Send the exact track price");
    expect(await tuneGate.hasAccess(fan.address, 0)).to.equal(false);

    await tuneGate.connect(fan).unlock(0, { value: price });
    await expect(tuneGate.connect(fan).unlock(0, { value: price }))
      .to.be.revertedWith("Track already unlocked");
  });
});

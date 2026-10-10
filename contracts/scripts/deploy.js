async function main() {
  const TuneGate = await ethers.getContractFactory("TuneGate");
  const tuneGate = await TuneGate.deploy();
  await tuneGate.waitForDeployment();

  console.log(`TuneGate deployed to: ${await tuneGate.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

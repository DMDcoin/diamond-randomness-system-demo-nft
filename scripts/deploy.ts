// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre from "hardhat";

const ethers = hre.ethers;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const DemoNFT = await ethers.getContractFactory("DemoNFT");

  // todo: get address  from DMD network,
  // or deploy a new random contract.
  const rngContractAddress = "0x7000000000000000000000000000000000000001";
  const healthContractAddress = "0x1000000000000000000000000000000000000001";

  const nft = await DemoNFT.deploy(rngContractAddress, healthContractAddress);
  await nft.deployed();
  console.log("DemoNFT deployed to:", nft.address);

  // verify on blockscout.
  // holds the network IDs of supported networks for verification.
  // todo: maybe just read it out of config file ?!
  const listOfSupportedNetworks = [777012];

  const network = await ethers.provider.getNetwork();

  if (listOfSupportedNetworks.includes(network.chainId)) {
    await hre.run("verify:verify", {
      address: nft.address,
      constructorArguments: [rngContractAddress, healthContractAddress],
    });
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

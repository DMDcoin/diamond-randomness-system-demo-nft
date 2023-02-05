import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  DemoNFT,
  DemoNFT__factory,
  IRandomHbbft,
  /* eslint-disable-next-line */
} from "../typechain";

describe("NFT", function () {
  let signers: SignerWithAddress[] | undefined;
  let main: string = "";
  let mainSigner: SignerWithAddress | undefined;
  let nftPayerAccount: SignerWithAddress | undefined;
  let nftReveiverAccount: SignerWithAddress | undefined;
  let nftServiceAccount: SignerWithAddress | undefined;
  let NFT: DemoNFT__factory | undefined;

  const registrationFee: { value: string } = { value: "1000000000000000000" };

  before(async () => {
    signers = await ethers.getSigners();
    mainSigner = signers[0];
    main = mainSigner.address;
    nftPayerAccount = signers[1];
    nftReveiverAccount = signers[2];
    nftServiceAccount = signers[3];
    NFT = await ethers.getContractFactory("DemoNFT");
  });

  let rng: IRandomHbbft | undefined;
  let nft: DemoNFT | undefined;

  let networkCurrentlyHealthy: boolean = false;

  it("deploy contract", async function () {
    const rngContractAddress = "0x3000000000000000000000000000000000000001";

    rng = await ethers.getContractAt("IRandomHbbft", rngContractAddress);

    // console.log(`is network healthy?`);
    // we assume that this status stays the same for the duration of the test
    networkCurrentlyHealthy = await rng.isFullHealth();

    // console.log(`Network is healthy: ${networkCurrentlyHealthy}`);
    // console.log(`deploying contracts...`);
    nft = await NFT?.deploy(rng?.address!);
    // console.log(`awaiting deployment...`);
    await nft?.deployed();
  });

  it("minting should fail if not registered", async () => {
    if (nft) {
      await expect(nft.mintTo(main)).to.be.throw;
    }
  });

  it("registering minting should fail if not enough minting fee is provided.", async () => {
    if (nft) {
      await expect(nft.registerMinting(main)).to.be.throw;
    }
  });

  it("registering minting should succeed if enough minting fee is provided.", async () => {
    if (nft) {
      // console.log("registering minting...");
      const mintRegistration = await nft.registerMinting(main, registrationFee);
      await mintRegistration.wait();
    }
  });

  it("registering minting should fail if already registered.", async () => {
    if (nft) {
      await expect(nft.registerMinting(main, registrationFee)).to.be.throw;
    }
    // console.log("mintTX:", mintTX?.hash);
  });

  it("minting should succeed if registered.", async () => {
    console.log("minting...");
    if (nft) {
      const mintToTx = await nft.mintTo(main, { gasLimit: 1000000 });
      await mintToTx.wait();
      const tokenID = 1;
      const owner = await nft.ownerOf(tokenID);
      expect(owner).to.equal(main);
      const tokenDna = await nft.tokenDna(tokenID);
      expect(tokenDna).not.to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    }
  });
});

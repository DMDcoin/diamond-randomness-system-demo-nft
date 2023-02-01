import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  DemoNFT,
  DemoNFT__factory,
  IRandomHbbft,
  INetworkHealthHbbft,
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
  let health: INetworkHealthHbbft | undefined;

  let networkCurrentlyHealthy: boolean = false;

  it("deploy contract", async function () {
    const rngContractAddress = "0x7000000000000000000000000000000000000001";
    const healthContractAddress = "0x1000000000000000000000000000000000000001";

    rng = await ethers.getContractAt("IRandomHbbft", rngContractAddress);
    health = await ethers.getContractAt(
      "INetworkHealthHbbft",
      healthContractAddress
    );

    // we assume that this status stays the same for the duration of the test
    networkCurrentlyHealthy = await health.isFullHealth();

    console.log(`Network is healthy: ${networkCurrentlyHealthy}`);
    console.log(`deploying contracts...`);
    nft = await NFT?.deploy(rng?.address!, health?.address!);
    console.log(`awaiting deployment...`);
    await nft?.deployed();
  });

  // it("minting should fail if not registered", async () => {
  //   if (nft) {
  //     expect(await nft.mintTo(main)).to.be.reverted;
  //   }
  // });

  // it("registering minting should fail if not enough minting fee is provided.", async () => {
  //   if (nft) {
  //     await nft.registerMinting(main);
  //   }
  // });

  it("registering minting should succeed if enough minting fee is provided.", async () => {
    if (nft) {
      const mintRegistration = await nft.registerMinting(main, registrationFee);
      mintRegistration.wait();
    }
    // console.log("mintTX:", mintTX?.hash);
  });

  // it("registering minting should fail if already registered.", async () => {
  //   if (nft) {
  //     await expect(nft.registerMinting(main, registrationFee)).to.be.thrown();
  //   }
  //   // console.log("mintTX:", mintTX?.hash);
  // });

  it("minting should succeed if registered.", async () => {
    if (nft) {
      await nft.mintTo(main, { gasLimit: 1000000 });
      const tokenID = 1;
      const owner = await nft.ownerOf(tokenID);
      expect(owner).to.equal(main);
      const tokenDna = await nft.tokenDna(tokenID);
      expect(tokenDna).not.to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    }
  });

  it("minting registration and minting for other accounts should be possible", async () => {
    if (nft && nftPayerAccount && nftServiceAccount) {
      await nft
        .connect(nftPayerAccount)
        .registerMinting(nftReveiverAccount?.address!, registrationFee);

      await nft.connect(nftServiceAccount).mintTo(nftReveiverAccount?.address!);

      // reveiver have never sent a transaction.
      expect(
        await ethers.provider.getTransactionCount(nftReveiverAccount?.address!)
      ).to.equal(0);

      // ... but it still owns an NFT.
      expect(await nft.ownerOf(2)).to.equal(nftReveiverAccount?.address!);
    }
  });
});

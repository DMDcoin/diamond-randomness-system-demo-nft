import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import fs from "fs";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const getMnemonic = () => {
  try {
    return fs.readFileSync(".mnemonic").toString().trim();
  } catch {
    // this is a dummy mnemonic
    return "rival month fortune";
  }
};

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    alpha: {
      url: "http://38.242.206.145:8540",
      accounts: {
        mnemonic: getMnemonic(),
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    // apiKey: process.env.ETHERSCAN_API_KEY,
    apiKey: "123",
    customChains: [
      {
        network: "alpha",
        chainId: 777012,
        urls: {
          apiURL: "http://explorer.uniq.diamonds/api",
          browserURL: "http://explorer.uniq.diamonds",
        },
      },
    ],
  },
};

export default config;

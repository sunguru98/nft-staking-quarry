import { QuarryMineJSON } from "./../idls/quarry_mine";
import { PublicKey } from "@solana/web3.js";
import fs from "fs-extra";
import { DEFAULT_TOKEN_DECIMALS, getAnchorProgram } from "../constants";
import BN from "bn.js";

const {
  coder,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  try {
    const minerPDARaw = fs.readJSONSync(
      `${__dirname}/../pubkeys/minerPDA.json`,
      { encoding: "utf-8" }
    );

    if (!minerPDARaw) throw new Error("Miner PDA not found");

    const minerPDA = new PublicKey(minerPDARaw);

    const minerPDAAccountInfo = await SOLANA_CONNECTION.getAccountInfo(
      minerPDA
    );

    if (minerPDAAccountInfo) {
      const minerDecoded = coder.accounts.decode(
        "Miner",
        minerPDAAccountInfo.data
      );

      console.log(
        `Miner Rewards Earned: ${
          (minerDecoded.rewardsEarned as BN).toNumber() / DEFAULT_TOKEN_DECIMALS
        }`
      );

      console.log(
        `Miner Balance: ${(minerDecoded.balance as BN).toNumber()} NFT`
      );
    }
  } catch (err) {
    console.error((err as Error).message);
  }
})();

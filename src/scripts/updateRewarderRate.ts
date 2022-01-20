import { QuarryMineJSON } from "./../idls/quarry_mine";
import { ANNUAL_REWARDS_RATE, getAnchorProgram } from "../constants";
import rewarderPDA from "../pubkeys/rewarderPDA.json";
import { Transaction } from "@solana/web3.js";

const {
  instruction: programInstruction,
  provider: { wallet, connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

const REWARDER_AUTHORITY = wallet.publicKey;

(async function () {
  try {
    console.log(
      "Setting Annual Rewards for the Rewarder account of",
      ANNUAL_REWARDS_RATE.toNumber()
    );

    const setAnnualRewardsIx = programInstruction.setAnnualRewards(
      ANNUAL_REWARDS_RATE,
      {
        accounts: {
          auth: {
            authority: REWARDER_AUTHORITY,
            rewarder: rewarderPDA,
          },
        },
      }
    );

    const transaction = new Transaction();
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    transaction.add(setAnnualRewardsIx);

    const signedTx = await wallet.signTransaction(transaction);
    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTx.serialize()
    );
    await SOLANA_CONNECTION.confirmTransaction(txHash);

    console.log(`Change Rewarder Annual Rate Tx: ${txHash}`);
    console.log(`Rewarder new annual rate: ${ANNUAL_REWARDS_RATE.toNumber()}`);
  } catch (err) {
    console.error(err);
  }
})();

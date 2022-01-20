import minterPDA from "../pubkeys/minterPDA.json";
import mintWrapperPDA from "../pubkeys/mintWrapperPDA.json";

import { QuarryMintWrapperJSON } from "./../idls/quarry_mint_wrapper";
import BN from "bn.js";
import {
  getAnchorProgram,
  ANNUAL_REWARDS_RATE,
  DEFAULT_TOKEN_DECIMALS,
} from "../constants";
import { Keypair, Transaction } from "@solana/web3.js";

import fs from "fs-extra";

const {
  instruction: mintWrapperInstruction,
  provider: { wallet, connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMintWrapperJSON, "mintWrapper");

const SIGNER_TWO = Keypair.fromSecretKey(
  Uint8Array.from(fs.readJSONSync(`${__dirname}/../keypairs/mulsig-2.json`))
);
const MINT_WRAPPER_ADMIN = SIGNER_TWO.publicKey;

(async function () {
  try {
    console.log(
      "SETTING MINTER ALLOWANCE OF:",
      ANNUAL_REWARDS_RATE.div(new BN(10 ** DEFAULT_TOKEN_DECIMALS)).toString()
    );

    const setMinterAllowanceIx = mintWrapperInstruction.minterUpdate(
      new BN(ANNUAL_REWARDS_RATE),
      {
        accounts: {
          auth: {
            admin: MINT_WRAPPER_ADMIN,
            mintWrapper: mintWrapperPDA,
          },
          minter: minterPDA,
        },
      }
    );

    const transaction = new Transaction().add(setMinterAllowanceIx);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    const signedTx = await wallet.signTransaction(transaction);
    signedTx.partialSign(SIGNER_TWO);
    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTx.serialize()
    );

    await SOLANA_CONNECTION.confirmTransaction(txHash);
    console.log(`Minter Allowance Bump TX: ${txHash}`);
  } catch (err) {
    console.error(err);
  }
})();

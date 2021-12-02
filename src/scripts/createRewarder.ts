import { config } from "dotenv";
import { QuarryMintWrapperJSON } from "./../idls/quarry_mint_wrapper";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { ANNUAL_REWARDS_RATE, getAnchorProgram } from "./../constants";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import { getRewarderPDA } from "../pda";

config();

import fs from "fs-extra";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION, wallet },
} = getAnchorProgram(QuarryMineJSON, "mine");

const REWARDER_AUTHORITY = wallet.publicKey;
const PAYER = wallet.publicKey;

(async function () {
  const { baseKeypair, bump, rewarderPDA } = await getRewarderPDA();
  const mintWrapperPDA = await fs.readJSONSync(
    `${__dirname}/../pubkeys/mintWrapperPDA.json`
  );

  if (!mintWrapperPDA) {
    throw new Error("Honey Mint Wrapper Does not Exist");
  }

  const mintWrapperData = await SOLANA_CONNECTION.getAccountInfo(
    new PublicKey(mintWrapperPDA)
  );

  if (!mintWrapperData?.data) {
    throw new Error("Honey Mintwrapper data does not exist");
  }

  const mintWrapperProgram = getAnchorProgram(
    QuarryMintWrapperJSON,
    "mintWrapper"
  );

  const mintWrapperDecoded = mintWrapperProgram.coder.accounts.decode(
    "MintWrapper",
    mintWrapperData.data
  );

  const associatedTokenAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintWrapperDecoded.tokenMint,
    rewarderPDA,
    true
  );

  console.log(
    "Creating Associated Token Account for Rewarder Account:",
    associatedTokenAddress.toString()
  );

  const createAssociatedTokenIx = Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintWrapperDecoded.tokenMint,
    associatedTokenAddress,
    rewarderPDA,
    PAYER
  );

  console.log(
    "Creating Rewarder account with Honey Mint:",
    rewarderPDA.toString()
  );

  const createNewRewarderIx = programInstruction.newRewarder(bump, {
    accounts: {
      base: baseKeypair.publicKey,
      rewarder: rewarderPDA,
      authority: REWARDER_AUTHORITY,
      payer: PAYER,
      systemProgram: SystemProgram.programId,
      unusedClock: SYSVAR_CLOCK_PUBKEY,
      mintWrapper: mintWrapperPDA,
      rewardsTokenMint: mintWrapperDecoded.tokenMint,
      claimFeeTokenAccount: associatedTokenAddress,
    },
  });

  console.log("Setting Annual Rewards for the Rewarder account");

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
  transaction.recentBlockhash = (
    await SOLANA_CONNECTION.getRecentBlockhash()
  ).blockhash;

  transaction.feePayer = PAYER;

  transaction.add(
    createAssociatedTokenIx,
    createNewRewarderIx,
    setAnnualRewardsIx
  );

  const signedTransaction = await wallet.signTransaction(transaction);
  signedTransaction.partialSign(baseKeypair);

  await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());

  await fs.writeJSON(
    `${__dirname}/../pubkeys/rewarderPDA.json`,
    rewarderPDA.toString()
  );

  await fs.writeJSON(
    `${__dirname}/../pubkeys/rewarderPDAToken.json`,
    associatedTokenAddress.toString()
  );
})();

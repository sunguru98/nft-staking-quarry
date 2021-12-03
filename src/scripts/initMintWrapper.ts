import { config } from "dotenv";
import {
  DEFAULT_TOKEN_DECIMALS,
  getAnchorProgram,
  HONEY_TOKEN_HARD_CAP,
} from "./../constants";
import { QuarryMintWrapperJSON } from "./../idls/quarry_mint_wrapper";
import { getMintWrapperPDA } from "../pda";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { parseTokenHardCap } from "../utils";

import { writeJSON } from "fs-extra";

config();

const {
  provider: { connection: SOLANA_CONNECTION, wallet },
  programId,
  transaction: programTransaction,
} = getAnchorProgram(QuarryMintWrapperJSON, "mintWrapper");

const MINT_WRAPPER_ADMIN = wallet.publicKey;
const PAYER = wallet.publicKey;

(async function () {
  console.log("Signing transction with address", PAYER.toString());
  const honeyMintKeypair = new Keypair();

  const { baseKeyPair, mintWrapperPDA, bump } = await getMintWrapperPDA(
    programId
  );

  const hardCapU64 = parseTokenHardCap(
    DEFAULT_TOKEN_DECIMALS,
    HONEY_TOKEN_HARD_CAP.toString()
  );

  const mintSpace = MintLayout.span;

  console.log("Allocating space for mint account");
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: PAYER,
    newAccountPubkey: honeyMintKeypair.publicKey,
    lamports: await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
      mintSpace
    ),
    programId: TOKEN_PROGRAM_ID,
    space: mintSpace,
  });

  console.log(
    "Initializing mint account of address:",
    honeyMintKeypair.publicKey.toString()
  );

  const initMintIx = Token.createInitMintInstruction(
    TOKEN_PROGRAM_ID,
    honeyMintKeypair.publicKey,
    DEFAULT_TOKEN_DECIMALS,
    mintWrapperPDA,
    mintWrapperPDA
  );

  console.log(
    "Creating new mint wrapper for above mint of address:",
    mintWrapperPDA.toString()
  );

  const transaction = programTransaction.newWrapper(bump, hardCapU64, {
    accounts: {
      base: baseKeyPair.publicKey,
      mintWrapper: mintWrapperPDA,
      admin: MINT_WRAPPER_ADMIN,
      tokenMint: honeyMintKeypair.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      payer: PAYER,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseKeyPair],
    instructions: [createMintAccountIx, initMintIx],
  });

  transaction.feePayer = PAYER;
  transaction.recentBlockhash = (
    await SOLANA_CONNECTION.getRecentBlockhash()
  ).blockhash;

  const signedTransaction = await wallet.signTransaction(transaction);
  signedTransaction.partialSign(baseKeyPair, honeyMintKeypair);

  await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());

  await writeJSON(
    `${__dirname}/../pubkeys/rewardsMint.json`,
    honeyMintKeypair.publicKey.toString()
  );
  await writeJSON(
    `${__dirname}/../pubkeys/mintWrapperPDA.json`,
    mintWrapperPDA.toString()
  );
})();

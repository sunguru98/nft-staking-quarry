import fs from "fs-extra";
import * as BufferLayout from "@solana/buffer-layout";
import { MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ANCHOR_PROVIDER, DEFAULT_TOKEN_DECIMALS } from "../constants";
import mulsigSigner1 from "../keypairs/mulsig-1.json";
import mulsigSigner2 from "../keypairs/mulsig-2.json";
import mulsigSigner3 from "../keypairs/mulsig-3.json";

import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

const MultisigLayout = BufferLayout.struct([
  BufferLayout.u8("m"),
  BufferLayout.u8("n"),
  BufferLayout.u8("is_initialized"),
  BufferLayout.blob(32, "signer1"),
  BufferLayout.blob(32, "signer2"),
  BufferLayout.blob(32, "signer3"),
  BufferLayout.blob(32, "signer4"),
  BufferLayout.blob(32, "signer5"),
  BufferLayout.blob(32, "signer6"),
  BufferLayout.blob(32, "signer7"),
  BufferLayout.blob(32, "signer8"),
  BufferLayout.blob(32, "signer9"),
  BufferLayout.blob(32, "signer10"),
  BufferLayout.blob(32, "signer11"),
]);

const { connection: SOLANA_CONNECTION, wallet } = ANCHOR_PROVIDER;

const NUMBER_OF_SIGNATURES_REQUIRED = 2;
const TAG = 2;

(async function () {
  console.log("Payer:", wallet.publicKey.toString());
  const SIGNER_ONE = Keypair.fromSecretKey(Uint8Array.from(mulsigSigner1));
  const SIGNER_TWO = Keypair.fromSecretKey(Uint8Array.from(mulsigSigner2));
  const SIGNER_THREE = Keypair.fromSecretKey(Uint8Array.from(mulsigSigner3));

  try {
    const multisigRentRequired =
      await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        MultisigLayout.span
      );

    const mintRentRequired =
      await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(
        MintLayout.span
      );

    const multiSigAccount = new Keypair();
    const mintAccount = new Keypair();

    const createMulSigIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: multiSigAccount.publicKey,
      lamports: multisigRentRequired,
      programId: TOKEN_PROGRAM_ID,
      space: MultisigLayout.span,
    });

    const initMulSigIx = new TransactionInstruction({
      keys: [
        {
          pubkey: multiSigAccount.publicKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
        ...[SIGNER_ONE, SIGNER_TWO, SIGNER_THREE].map((signer) => ({
          pubkey: signer.publicKey,
          isSigner: false,
          isWritable: false,
        })),
      ],
      programId: TOKEN_PROGRAM_ID,
      data: Buffer.from(Uint8Array.of(TAG, NUMBER_OF_SIGNATURES_REQUIRED)),
    });

    const createMintAccIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: mintRentRequired,
      programId: TOKEN_PROGRAM_ID,
      space: MintLayout.span,
    });

    const initMintIx = Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      DEFAULT_TOKEN_DECIMALS,
      wallet.publicKey,
      wallet.publicKey
    );

    const changeMintAuthIx = Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      multiSigAccount.publicKey,
      "MintTokens",
      wallet.publicKey,
      []
    );

    const changeFreezeAuthIx = Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      multiSigAccount.publicKey,
      "FreezeAccount",
      wallet.publicKey,
      []
    );

    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      wallet.publicKey,
      false
    );

    const createAssoIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      associatedTokenAddress,
      wallet.publicKey,
      wallet.publicKey
    );

    // MOST IMPORTANT STEP
    const mintTokensIx = Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      associatedTokenAddress,
      multiSigAccount.publicKey, // Multi sig account being token mint authority
      [SIGNER_ONE, SIGNER_TWO], // Passing 2/3 signers
      1000 * 10 ** DEFAULT_TOKEN_DECIMALS
    );

    const transaction = new Transaction().add(
      createMulSigIx,
      initMulSigIx,
      createMintAccIx,
      initMintIx,
      changeMintAuthIx,
      changeFreezeAuthIx,
      createAssoIx,
      mintTokensIx
    );

    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTx = await wallet.signTransaction(transaction);
    // Creating multi sig account
    signedTx.partialSign(multiSigAccount);
    // Creating mint account
    signedTx.partialSign(mintAccount);
    // Signer 1 for minting tokens
    signedTx.partialSign(SIGNER_ONE);
    // Signer 2 for minting tokens
    signedTx.partialSign(SIGNER_TWO);

    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTx.serialize()
    );

    await SOLANA_CONNECTION.confirmTransaction(txHash);
    console.log(`Multisig Account: ${multiSigAccount.publicKey}`);
    console.log(`Mint Account: ${mintAccount.publicKey}`);

    await fs.writeJSON(
      `${__dirname}/../pubkeys/multisig.json`,
      multiSigAccount.publicKey.toString()
    );

    await fs.writeJSON(
      `${__dirname}/../pubkeys/multisigMint.json`,
      mintAccount.publicKey.toString()
    );
  } catch (err) {
    console.error(err);
  }
})();

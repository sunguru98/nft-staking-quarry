import fs from "fs-extra";
import { DEFAULT_TOKEN_DECIMALS, HONEY_TOKEN_HARD_CAP } from "./../constants";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { QuarryMintWrapperJSON } from "./../idls/quarry_mint_wrapper";
import { getAnchorProgram } from "../constants";

import multiSigRaw from "../pubkeys/multisig.json";
import multiSigMintRaw from "../pubkeys/multisigMint.json";
import mulsigTwo from "../keypairs/mulsig-2.json";
import mulsigThree from "../keypairs/mulsig-3.json";

import { getMintWrapperPDA } from "../pda";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { parseTokenHardCap } from "../utils";

const {
  provider: { connection: SOLANA_CONNECTION, wallet },
  instruction: mintWrapperInstruction,
} = getAnchorProgram(QuarryMintWrapperJSON, "mintWrapper");

(async function () {
  try {
    const multisigAccount = new PublicKey(multiSigRaw);
    const tokenMint = new PublicKey(multiSigMintRaw);

    const {
      baseKeyPair: baseKeypair,
      // mintWrapperPDA,
      bump,
    } = await getMintWrapperPDA();

    const mintWrapperPDA = new PublicKey(
      JSON.parse(
        fs.readFileSync(`${__dirname}/../pubkeys/mintWrapperPDA.json`, {
          encoding: "utf-8",
        })
      )
    );

    const SIGNER_TWO = Keypair.fromSecretKey(
      Buffer.from(Uint8Array.from(mulsigTwo))
    );
    const SIGNER_THREE = Keypair.fromSecretKey(
      Buffer.from(Uint8Array.from(mulsigThree))
    );

    const tokenHardCap = parseTokenHardCap(
      DEFAULT_TOKEN_DECIMALS,
      HONEY_TOKEN_HARD_CAP.toString()
    );

    const transferMintAuthIx = Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      tokenMint,
      mintWrapperPDA,
      "MintTokens",
      multisigAccount,
      [SIGNER_TWO, SIGNER_THREE]
    );

    const transferFreezeAuthIx = Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      tokenMint,
      mintWrapperPDA,
      "FreezeAccount",
      multisigAccount,
      [SIGNER_TWO, SIGNER_THREE]
    );

    const initMintWrapperIx = mintWrapperInstruction.newWrapper(
      bump,
      tokenHardCap,
      {
        accounts: {
          admin: SIGNER_TWO.publicKey, // One of the multisig owners
          base: baseKeypair.publicKey,
          mintWrapper: mintWrapperPDA,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [baseKeypair],
      }
    );

    const surrenderAuthIx = mintWrapperInstruction.surrenderAuthority({
      accounts: {
        admin: SIGNER_TWO.publicKey,
        mintWrapper: mintWrapperPDA,
        newMintAuthority: multisigAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      SIGNER_TWO.publicKey,
      false
    );
    const createTokenIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      associatedTokenAddress,
      SIGNER_TWO.publicKey,
      SIGNER_TWO.publicKey
    );

    const mintTokensIx = Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      tokenMint,
      associatedTokenAddress,
      multisigAccount,
      [SIGNER_TWO, SIGNER_THREE],
      1000 * 10 ** DEFAULT_TOKEN_DECIMALS
    );

    const transaction = new Transaction().add(
      transferMintAuthIx
      // transferFreezeAuthIx,
      // initMintWrapperIx
      // surrenderAuthIx
      // createTokenIx,
      // mintTokensIx
    );

    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTx = await wallet.signTransaction(transaction);
    // signedTx.partialSign(baseKeypair);
    signedTx.partialSign(SIGNER_THREE);
    signedTx.partialSign(SIGNER_TWO);

    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTx.serialize()
    );
    await SOLANA_CONNECTION.confirmTransaction(txHash);
    console.log(`Mint Wrapper Create TX: ${txHash}`);

    console.log(`Mint Wrapper PDA: ${mintWrapperPDA.toString()}`);

    await fs.writeJSON(
      `${__dirname}/../pubkeys/mintWrapperPDA.json`,
      mintWrapperPDA.toString()
    );

    await fs.writeJSON(
      `${__dirname}/../pubkeys/rewardsMint.json`,
      tokenMint.toString()
    );

    const mintAccountInfo = await SOLANA_CONNECTION.getAccountInfo(tokenMint);
    if (mintAccountInfo) {
      const decodedTokenInfo = MintLayout.decode(mintAccountInfo.data);
      console.log(
        `Token Mint Authority: ${new PublicKey(
          decodedTokenInfo.mintAuthority
        ).toString()}`
      );
    }
  } catch (err) {
    console.error(err);
  }
})();

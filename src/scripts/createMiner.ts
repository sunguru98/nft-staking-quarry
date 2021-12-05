import fs from "fs-extra";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import * as anchor from "@project-serum/anchor";
import {
  getAnchorProgram,
  MINER_SECRET_KEY,
  NFT_UPDATE_AUTHORITY,
} from "../constants";
import { getMinerPDA } from "../pda";
import { getAllNFTsOwned } from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const minerKeypair = Keypair.fromSecretKey(MINER_SECRET_KEY);
  const minerAuthWallet = new anchor.Wallet(minerKeypair);

  // PDA of ["Miner", quarryAcc, minerAuthority]
  const { rewarderPDA, quarryPDA, minerPDA, bump } = await getMinerPDA(
    minerAuthWallet.publicKey
  );

  console.log("Miner Authority:", minerAuthWallet.publicKey.toString());
  console.log("Fetching Miner Authority's NFTs");
  // Fetching all NFTs
  const userOwnedNFTs = await getAllNFTsOwned(
    minerKeypair.publicKey,
    SOLANA_CONNECTION
  );

  if (userOwnedNFTs.length > 0) {
    console.log(
      "User owns " + userOwnedNFTs.length + " NFTs of update authority:",
      NFT_UPDATE_AUTHORITY.toString()
    );

    const transaction = new Transaction();
    transaction.feePayer = minerAuthWallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    console.log("Creating Miner:", minerPDA.toString());

    const createMinerIx = programInstruction.createMiner(bump, {
      accounts: {
        authority: minerAuthWallet.publicKey,
        miner: minerPDA,
        quarry: quarryPDA,
        rewarder: rewarderPDA,
        systemProgram: SystemProgram.programId,
        payer: minerAuthWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        nftUpdateAuthority: NFT_UPDATE_AUTHORITY,
      },
    });

    transaction.add(createMinerIx);

    const signedTransaction = await minerAuthWallet.signTransaction(
      transaction
    );

    await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());
    await fs.writeJSON(
      `${__dirname}/../pubkeys/minerPDA.json`,
      minerPDA.toString()
    );
  } else {
    console.log("User doesn't have any NFTs. Please mint some :)");
  }
})();

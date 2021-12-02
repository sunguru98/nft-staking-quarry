import fs from "fs-extra";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import * as anchor from "@project-serum/anchor";
import {
  getAnchorProgram,
  METADATA_PROGRAM_ID,
  MINER_SECRET_KEY,
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
  const minerWallet = new anchor.Wallet(minerKeypair);

  // PDA of ["Miner", quarryAcc, minerAuthority]
  const { rewarderPDA, quarryPDA, minerPDA, bump } = await getMinerPDA(
    minerWallet.publicKey
  );

  console.log("Miner Authority:", minerWallet.publicKey.toString());
  console.log("Fetching Miner Authority's NFTs");
  // Fetching all NFTs
  const userOwnedNFTs = await getAllNFTsOwned(
    minerKeypair.publicKey,
    SOLANA_CONNECTION
  );

  if (userOwnedNFTs.length > 0) {
    const nft = userOwnedNFTs[0]!; // Just picking a random NFT

    const transaction = new Transaction();
    transaction.feePayer = minerWallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    const minerVaultAssocAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      nft.mint,
      minerPDA,
      // This is a lame logic inside spl-token but it's toggling the isPDAAsOwner attribute
      true
    );

    console.log(
      "Creating Associated Token Address for Miner:",
      minerVaultAssocAddress.toString()
    );

    if (!(await SOLANA_CONNECTION.getAccountInfo(minerVaultAssocAddress))) {
      const createMinerVaultAssociatedTokenIx =
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          nft.mint,
          minerVaultAssocAddress,
          minerPDA,
          minerWallet.publicKey
        );
      transaction.add(createMinerVaultAssociatedTokenIx);
    }

    console.log("Creating Miner:", minerPDA.toString());

    const createMinerIx = programInstruction.createMiner(
      bump,
      nft.metadata.bump,
      {
        accounts: {
          authority: minerWallet.publicKey,
          miner: minerPDA,
          quarry: quarryPDA,
          rewarder: rewarderPDA,
          systemProgram: SystemProgram.programId,
          payer: minerWallet.publicKey,
          tokenMint: nft.mint,
          tokenMetadata: nft.metadata.address,
          minerNftVault: minerVaultAssocAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    );

    transaction.add(createMinerIx);

    const signedTransaction = await minerWallet.signTransaction(transaction);

    await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());
    await fs.writeJSON(
      `${__dirname}/../pubkeys/minerPDA.json`,
      quarryPDA.toString()
    );
  } else {
    console.log("User doesn't have any NFTs. Please mint some :)");
  }
})();

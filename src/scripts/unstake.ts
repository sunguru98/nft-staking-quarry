import fs from "fs-extra";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import * as anchor from "@project-serum/anchor";
import { getAnchorProgram, MINER_SECRET_KEY } from "../constants";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAllNFTsOwned } from "../utils";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const minerAuthWallet = new anchor.Wallet(
    Keypair.fromSecretKey(MINER_SECRET_KEY)
  );

  const rewarderPDARaw = await fs.readJSON(
    `${__dirname}/../pubkeys/rewarderPDA.json`,
    {
      encoding: "utf-8",
    }
  );

  if (!rewarderPDARaw) {
    throw new Error("Rewarder PDA not present");
  }

  const quarryPDARaw = await fs.readJSON(
    `${__dirname}/../pubkeys/quarryPDA.json`,
    {
      encoding: "utf-8",
    }
  );

  if (!quarryPDARaw) {
    throw new Error("Quarry PDA not present");
  }

  const minerPDARaw = await fs.readJSON(
    `${__dirname}/../pubkeys/minerPDA.json`,
    {
      encoding: "utf-8",
    }
  );

  if (!minerPDARaw) {
    throw new Error("Miner PDA not present");
  }

  const stakedNFTMintRaw = await fs.readJSON(
    `${__dirname}/../pubkeys/stakedNFTMint.json`,
    {
      encoding: "utf-8",
    }
  );

  if (!stakedNFTMintRaw) {
    throw new Error("Staked NFT Mint not present");
  }

  const minerPDA = new PublicKey(minerPDARaw);
  const rewarderPDA = new PublicKey(rewarderPDARaw);
  const quarryPDA = new PublicKey(quarryPDARaw);
  const stakedNFTMint = new PublicKey(stakedNFTMintRaw);

  const minerAuthNFTs = await getAllNFTsOwned(
    minerAuthWallet.publicKey,
    SOLANA_CONNECTION
  );

  if (minerAuthNFTs.length) {
    console.log("Total owned NFTs", minerAuthNFTs.length);
    const nft = minerAuthNFTs.find((n) => n.mint.equals(stakedNFTMint));
    if (!nft) throw new Error("Cannot find staked NFT mint");
    console.log("Unstaking NFT of Mint:", nft.mint.toString());

    const minerAuthAssociatedTokenAddress =
      await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        nft.mint,
        minerAuthWallet.publicKey
      );

    if (
      !(await SOLANA_CONNECTION.getAccountInfo(minerAuthAssociatedTokenAddress))
    ) {
      throw new Error("Miner Auth Associated Token Address not found");
    }

    console.log(
      "Miner Authority Associated Token Address:",
      minerAuthAssociatedTokenAddress.toString()
    );
    console.log("NFT Metadata address:", nft.metadata.address.toString());

    const transaction = new Transaction();
    transaction.feePayer = minerAuthWallet.publicKey;
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

    console.log("Miner NFT Vault address:", minerVaultAssocAddress.toString());

    if (!(await SOLANA_CONNECTION.getAccountInfo(minerVaultAssocAddress))) {
      throw new Error("Miner NFT Vault doesn't exist");
    }

    console.log(
      `Unstaking NFT from Miner Vault Wallet ${minerVaultAssocAddress.toString()} to Miner Auth Wallet ${minerAuthAssociatedTokenAddress.toString()}`
    );

    const unStakeNFTIx = programInstruction.withdrawNft(1, nft.metadata.bump, {
      accounts: {
        authority: minerAuthWallet.publicKey,
        miner: minerPDA,
        quarry: quarryPDA,
        rewarder: rewarderPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount: minerAuthAssociatedTokenAddress,
        minerNftVault: minerVaultAssocAddress,
        tokenMetadata: nft.metadata.address,
        tokenMint: nft.mint,
      },
    });

    transaction.add(unStakeNFTIx);

    const signedTransaction = await minerAuthWallet.signTransaction(
      transaction
    );
    await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());

    await fs.writeJSON(
      `${__dirname}/../pubkeys/stakedNFTMetadata.json`,
      nft.metadata.address.toString()
    );

    await fs.writeJSON(
      `${__dirname}/../pubkeys/stakedNFTMint.json`,
      nft.mint.toString()
    );
  } else {
    console.log("No NFTs under the miner authority");
  }
})();

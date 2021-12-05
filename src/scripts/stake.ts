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
  coder,
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

  const minerPDA = new PublicKey(minerPDARaw);
  const rewarderPDA = new PublicKey(rewarderPDARaw);
  const quarryPDA = new PublicKey(quarryPDARaw);

  const minerAuthNFTs = await getAllNFTsOwned(
    minerAuthWallet.publicKey,
    SOLANA_CONNECTION
  );

  if (minerAuthNFTs.length) {
    console.log("Miner Authority:", minerAuthWallet.publicKey.toString());
    console.log("Total owned NFTs", minerAuthNFTs.length);
    const nft = minerAuthNFTs[2]!;
    console.log("Staking NFT of Mint:", nft.mint.toString());

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

    if (!(await SOLANA_CONNECTION.getAccountInfo(minerVaultAssocAddress))) {
      console.log(
        "Creating Associated Token Address for Miner:",
        minerVaultAssocAddress.toString()
      );
      const createMinerVaultAssociatedTokenIx =
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          nft.mint,
          minerVaultAssocAddress,
          minerPDA,
          minerAuthWallet.publicKey
        );
      transaction.add(createMinerVaultAssociatedTokenIx);
    }

    console.log(
      `Staking NFT from Miner Auth Wallet ${minerAuthAssociatedTokenAddress.toString()} to Miner Vault Wallet ${minerVaultAssocAddress.toString()}`
    );

    const stakeNFTIx = programInstruction.stakeNft(1, nft.metadata.bump, {
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

    transaction.add(stakeNFTIx);

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

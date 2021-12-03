import fs from "fs-extra";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import * as anchor from "@project-serum/anchor";
import { getAnchorProgram, MINER_SECRET_KEY } from "../constants";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAllNFTsOwned } from "../utils";

const {
  transaction: programTransaction,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const minerWallet = new anchor.Wallet(
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

  const minerPDAAssocTokenRaw = await fs.readJSON(
    `${__dirname}/../pubkeys/minerPDAAssocToken.json`,
    {
      encoding: "utf-8",
    }
  );

  if (!minerPDAAssocTokenRaw) {
    throw new Error("Miner PDA Associated Token not present");
  }

  const minerPDAAssocToken = new PublicKey(minerPDAAssocTokenRaw);
  const minerPDA = new PublicKey(minerPDARaw);
  const rewarderPDA = new PublicKey(rewarderPDARaw);
  const quarryPDA = new PublicKey(quarryPDARaw);

  const minerAuthNFTs = await getAllNFTsOwned(
    minerWallet.publicKey,
    SOLANA_CONNECTION
  );

  if (minerAuthNFTs.length) {
    const nft = minerAuthNFTs[1]!;

    const minerAuthAssociatedTokenAddress =
      await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        nft.mint,
        minerWallet.publicKey
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

    console.log(
      `Staking NFT from Miner Auth Wallet ${minerAuthAssociatedTokenAddress.toString()} to Miner Vault Wallet ${minerPDAAssocToken.toString()}`
    );

    const transaction = programTransaction.stakeNft(1, {
      accounts: {
        authority: minerWallet.publicKey,
        miner: minerPDA,
        quarry: quarryPDA,
        rewarder: rewarderPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount: minerAuthAssociatedTokenAddress,
        nftTokenVaultKey: minerPDAAssocToken,
        nftMetadata: nft.metadata.address,
      },
    });

    transaction.feePayer = minerWallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    const signedTransaction = await minerWallet.signTransaction(transaction);
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

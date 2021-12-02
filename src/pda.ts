import fs from "fs-extra";
import { Keypair, PublicKey } from "@solana/web3.js";
import { NFT_UPDATE_AUTHORITY, PROGRAM_IDS } from "./constants";

export async function getMintWrapperPDA(
  programId: PublicKey = new PublicKey(PROGRAM_IDS["mintWrapper"])
) {
  const baseKeyPair = new Keypair();
  const [mintWrapperPDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("MintWrapper"), baseKeyPair.publicKey.toBytes()],
    programId
  );

  return {
    baseKeyPair,
    mintWrapperPDA,
    bump,
  };
}

export async function getRewarderPDA(
  programId: PublicKey = new PublicKey(PROGRAM_IDS["mine"])
) {
  const baseKeypair = new Keypair();
  console.log("Base address for rewarder", baseKeypair.publicKey.toString());

  const [rewarderPDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("Rewarder"), baseKeypair.publicKey.toBuffer()],
    programId
  );

  return {
    baseKeypair,
    rewarderPDA,
    bump,
  };
}

export async function getQuarryPDA(
  programId: PublicKey = new PublicKey(PROGRAM_IDS["mine"]),
  updateAuthority: PublicKey = NFT_UPDATE_AUTHORITY
) {
  const rewarderPDA = await fs.readJSON(
    `${__dirname}/pubkeys/rewarderPDA.json`,
    { encoding: "utf-8" }
  );

  if (!rewarderPDA) throw new Error("Rewarder PDA not found");

  const [quarryPDA, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("Quarry"),
      new PublicKey(rewarderPDA).toBytes(),
      updateAuthority.toBytes(),
    ],
    programId
  );

  return {
    rewarderPDA: new PublicKey(rewarderPDA),
    quarryPDA,
    bump,
  };
}

export async function getMinerPDA(
  minerAuthority: PublicKey,
  programId: PublicKey = new PublicKey(PROGRAM_IDS["mine"])
) {
  const quarryPDA = await fs.readJSON(`${__dirname}/pubkeys/quarryPDA.json`, {
    encoding: "utf-8",
  });

  if (!quarryPDA) throw new Error("Rewarder PDA not found");

  const [minerPDA, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("Miner"),
      new PublicKey(quarryPDA).toBuffer(),
      minerAuthority.toBuffer(),
    ],
    programId
  );

  return {
    minerPDA,
    bump,
  };
}

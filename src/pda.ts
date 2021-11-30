import { Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_IDS } from "./constants";

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

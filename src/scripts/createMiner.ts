import { Keypair } from "@solana/web3.js";
import { QuarryMineJSON } from "./../idls/quarry_mine";
import * as anchor from "@project-serum/anchor";
import { getAnchorProgram, MINER_SECRET_KEY } from "../constants";
import { getMinerPDA } from "../pda";
import { getAllNFTsOwned } from "../utils";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const minerKeypair = Keypair.fromSecretKey(MINER_SECRET_KEY);
  const minerWallet = new anchor.Wallet(minerKeypair);

  const { minerPDA } = await getMinerPDA(minerKeypair.publicKey);

  console.log(await getAllNFTsOwned(minerKeypair.publicKey, SOLANA_CONNECTION));

  // const createMinerIx = programInstruction.createMiner();
})();

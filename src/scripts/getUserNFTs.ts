import * as anchor from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { getAnchorProgram, MINER_SECRET_KEY } from "../constants";
import { QuarryMineJSON } from "../idls/quarry_mine";
import { getAllNFTsOwned } from "../utils";

const {
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(MINER_SECRET_KEY));
  console.log(await getAllNFTsOwned(wallet.publicKey, SOLANA_CONNECTION));
})();

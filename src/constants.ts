import * as anchor from "@project-serum/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { readJSONSync } from "fs-extra";
import JSBI from "jsbi";

export const SUPPLY_ONE = Buffer.from(
  Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0])
);

export const DAILY_REWARDS_RATE = new anchor.BN(1000 * LAMPORTS_PER_SOL);
export const ANNUAL_REWARDS_RATE = DAILY_REWARDS_RATE.mul(new anchor.BN(365));

export const HONEY_TOKEN_HARD_CAP = 1_000_000_000_000;
export const DEFAULT_TOKEN_DECIMALS = 6;

export const ZERO = JSBI.BigInt(0);
export const MAX_U64 = JSBI.BigInt("0xffffffffffffffff");

export const PAYER_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/payer.json`)
);

export const MINER_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/miner.json`)
);

export const NFT_UPDATE_AUTHORITY = new PublicKey(
  "Ew81tE7S6ZeChD97cGabZRJCZSdDnMg9tDjUAVJDfV3S"
);

export const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const ENDPOINTS = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
};

export const ANCHOR_PROVIDER = new anchor.Provider(
  new Connection(ENDPOINTS.devnet),
  new anchor.Wallet(Keypair.fromSecretKey(PAYER_SECRET_KEY)),
  { skipPreflight: false, commitment: "confirmed" }
);

export const PROGRAM_IDS = {
  mintWrapper: "Cgjj9YzPmcVzZyQJ7FJTGH3Sq4vZprGLH5uuXh7LbUcp",
  mine: "6RRreJu7qYTnp2rWs6n74hKhGHh4D58CaGG9tPm9ZMqk",
};

export function getAnchorProgram<T extends anchor.Idl>(
  programIDL: T,
  programName: keyof typeof PROGRAM_IDS
) {
  return new anchor.Program(
    programIDL,
    PROGRAM_IDS[programName],
    ANCHOR_PROVIDER
  );
}

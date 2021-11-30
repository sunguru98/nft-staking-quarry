import * as anchor from "@project-serum/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { readJSONSync } from "fs-extra";
import JSBI from "jsbi";

export const DAILY_REWARDS_RATE = new anchor.BN(1000 * LAMPORTS_PER_SOL);
export const ANNUAL_REWARDS_RATE = DAILY_REWARDS_RATE.mul(new anchor.BN(365));

export const HONEY_TOKEN_HARD_CAP = 1_000_000_000_000;
export const DEFAULT_TOKEN_DECIMALS = 6;

export const ZERO = JSBI.BigInt(0);
export const MAX_U64 = JSBI.BigInt("0xffffffffffffffff");

export const PAYER_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/payer.json`)
);

export const ANCHOR_PROVIDER = new anchor.Provider(
  new Connection("https://api.devnet.solana.com"),
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

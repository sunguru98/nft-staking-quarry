import * as anchor from '@project-serum/anchor';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { readJSONSync } from 'fs-extra';
import JSBI from 'jsbi';

export const SUPPLY_ONE = Buffer.from(
  Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0])
);
export const HONEY_TOKEN_HARD_CAP = 1_000_000_000_000;
export const DEFAULT_TOKEN_DECIMALS = 6;

export const DAILY_REWARDS_RATE = new anchor.BN(
  30000 * 10 ** DEFAULT_TOKEN_DECIMALS
);

export const ANNUAL_REWARDS_RATE = DAILY_REWARDS_RATE.mul(new anchor.BN(365));
export const QUARRY_SHARE = ANNUAL_REWARDS_RATE.div(new anchor.BN(10));

export const PESKY_PENGUINS_SHARE = ANNUAL_REWARDS_RATE.div(new anchor.BN(7));

export const BAT_SHARE = ANNUAL_REWARDS_RATE.div(new anchor.BN(30));

export const SOLANA_SAMURAI_SHARE = ANNUAL_REWARDS_RATE.div(new anchor.BN(30));

export const ZERO = JSBI.BigInt(0);
export const MAX_U64 = JSBI.BigInt('0xffffffffffffffff');

export const PAYER_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/payer.json`)
);

export const TOM_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/tom.json`)
);

export const MINER_SECRET_KEY = new Uint8Array(
  readJSONSync(`${__dirname}/keypairs/miner.json`)
);

export const NFT_UPDATE_AUTHORITY = new PublicKey(
  'CHUotmd6qA4DHcW75GXReUEiQB1hwMqiruedUaqf8aaM'
);

export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

export const ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://solana-api.projectserum.com/',
  testnet: 'https://api.testnet.solana.com',
};

export const ANCHOR_PROVIDER = new anchor.Provider(
  new Connection(ENDPOINTS.mainnet),
  new anchor.Wallet(Keypair.fromSecretKey(TOM_SECRET_KEY)),
  { skipPreflight: false, commitment: 'confirmed' }
);

export const PROGRAM_IDS = {
  mintWrapper: 'EqoPvvQbG4g7woE2HUR4rpdtpEVumDzg9KGynvPeL3Pt',
  mine: '2gQgPpcni87aq5A6fPv32a7Z7cTJ1cFExyXorPjjLV5G',
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

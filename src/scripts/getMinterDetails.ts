import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { getAnchorProgram } from "../constants";
import { QuarryMineJSON } from "../idls/quarry_mine";

import * as BufferLayout from "@solana/buffer-layout";
import { u64 } from "@solana/spl-token";

/**
 * Layout for a public key
 */
export const publicKey = (
  property: string = "publicKey"
): BufferLayout.Blob => {
  return BufferLayout.blob(32, property);
};

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = "uint64"): BufferLayout.Blob => {
  return BufferLayout.blob(8, property);
};

export const MinterLayout = BufferLayout.struct([
  publicKey("mintWrapper"),
  publicKey("minterAuthority"),
  BufferLayout.u8("bump"),
  uint64("index"),
  uint64("allowance"),
  uint64("totalMinted"),
]);

const {
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

const MINTER_PDA = new PublicKey(
  "A1mVLDaG1iVAzAfMoUnYKboEdv8zF7mXPPUKNudc7pUo"
);

const ANCHOR_DELIMITTER_OFFSET = 8;

(async function () {
  try {
    const accountInfo = await SOLANA_CONNECTION.getAccountInfo(MINTER_PDA);
    const decodedData = MinterLayout.decode(
      accountInfo?.data!,
      ANCHOR_DELIMITTER_OFFSET
    );

    console.log({
      mintWrapper: new PublicKey(decodedData.mintWrapper).toString(),
      minterAuthority: new PublicKey(decodedData.minterAuthority).toString(),
      bump: decodedData.bump,
      index: u64.fromBuffer(decodedData.index).toNumber(),
      allowance: u64.fromBuffer(decodedData.allowance).toNumber(),
      totalMinted: u64.fromBuffer(decodedData.totalMinted).toNumber(),
    });
  } catch (err) {
    console.error(err);
  }
})();

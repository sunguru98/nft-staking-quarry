import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { getAnchorProgram } from "../constants";
import { QuarryMineJSON } from "../idls/quarry_mine";

import * as BufferLayout from "@solana/buffer-layout";
import { u64 } from "@solana/spl-token";
import { u128 } from "../utils";

import farms from "../farms.json";

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

export const QuarryLayout = BufferLayout.struct([
  publicKey("rewarderKey"),
  BufferLayout.u8("tokenMintDecimals"),
  publicKey("nftUpdateAuthority"),
  BufferLayout.u8("bump"),
  BufferLayout.blob(2, "index"),
  uint64("famineTs"),
  uint64("lastUpdateTs"),
  BufferLayout.blob(16, "rewardsPerTokenStored"),
  uint64("annualRewardsRate"),
  uint64("rewardsShare"),
  uint64("totalTokensDeposited"),
  uint64("numMiners"),
]);

const {
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

const ANCHOR_DELIMITTER_OFFSET = 8;

async function getQuarryDetails(quarryKey: PublicKey) {
  try {
    const accountInfo = await SOLANA_CONNECTION.getAccountInfo(quarryKey);
    const decodedData = QuarryLayout.decode(
      accountInfo?.data!,
      ANCHOR_DELIMITTER_OFFSET
    );

    return {
      rewarderKey: new PublicKey(decodedData.rewarderKey).toString(),
      tokenMintDecimals: decodedData.tokenMintDecimals,
      bump: decodedData.bump,
      index: Buffer.from(decodedData.index).readUInt16LE(0),
      famineTs: parseInt(
        Buffer.from(decodedData.famineTs).readBigInt64LE(0).toString()
      ),
      lastUpdateTs: parseInt(
        Buffer.from(decodedData.lastUpdateTs).readBigInt64LE(0).toString()
      ),
      rewardsPerTokenStored: new BN(
        decodedData.rewardsPerTokenStored
      ).toString(),
      annualRewardsRate: u64
        .fromBuffer(decodedData.annualRewardsRate)
        .toNumber(),
      rewardsShare: u64.fromBuffer(decodedData.rewardsShare).toNumber(),
      totalTokensDeposited: u64
        .fromBuffer(decodedData.totalTokensDeposited)
        .toNumber(),
      numMiners: u64.fromBuffer(decodedData.numMiners).toNumber(),
    };
  } catch (err) {
    console.error(err);
    return { index: 0 };
  }
}

(async function () {
  const quarryKeys = farms.map((farm) => new PublicKey(farm.quarry_key));
  const quarryDatas = [];
  for (let quarry of quarryKeys) {
    quarryDatas.push({
      quarry: quarry.toString(),
      data: await getQuarryDetails(quarry),
    });
  }

  const sortedQuarries = quarryDatas.sort((a, b) =>
    a.data.index > b.data.index ? 1 : -1
  );

  const liveQuarries = sortedQuarries.filter(
    (q) => q.data.annualRewardsRate! > 0 && q.data.rewardsShare! > 0
  );

  const completedQuarries = sortedQuarries.filter(
    (q) => q.data.annualRewardsRate! === 0 && q.data.rewardsShare === 0
  );

  console.log(`Live Quarries`, liveQuarries);
  // console.log(`Completed Quarries`, completedQuarries);
})();

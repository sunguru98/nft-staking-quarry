import { PublicKey } from '@solana/web3.js';
import { DEFAULT_TOKEN_DECIMALS, getAnchorProgram } from '../constants';
import { QuarryMineJSON } from '../idls/quarry_mine';

import * as BufferLayout from '@solana/buffer-layout';
import { u64 } from '@solana/spl-token';

/**
 * Layout for a public key
 */
export const publicKey = (
  property: string = 'publicKey'
): BufferLayout.Blob => {
  return BufferLayout.blob(32, property);
};

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = 'uint64'): BufferLayout.Blob => {
  return BufferLayout.blob(8, property);
};

export const RewarderLayout = BufferLayout.struct([
  publicKey('base'),
  BufferLayout.u8('bump'),
  publicKey('authority'),
  publicKey('pendingAuthority'),
  BufferLayout.blob(2, 'numQuarries'),
  uint64('annualRewardsRate'),
  uint64('totalRewardsShares'),
  publicKey('mintWrapper'),
  publicKey('rewardsTokenMint'),
  publicKey('claimFeeTokenAccount'),
  uint64('maxClaimFeeMillibps'),
  publicKey('pauseAuthority'),
  BufferLayout.u8('isPaused'),
]);

const {
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, 'mine');

const REWARDER_PDA = new PublicKey(
  '4kk3PYMR1K1xUeVN29ePDDnybrhtCCeqq6HYHj1aeUXF'
);

(async function () {
  try {
    const accountInfo = await SOLANA_CONNECTION.getAccountInfo(REWARDER_PDA);
    const decodedData = RewarderLayout.decode(accountInfo?.data!, 8);
    console.log({
      base: new PublicKey(decodedData.base).toString(),
      bump: decodedData.bump,
      authority: new PublicKey(decodedData.authority).toString(),
      pendingAuthority: new PublicKey(decodedData.pendingAuthority).toString(),
      numQuarries: Buffer.from(decodedData.numQuarries).readUInt16LE(0),
      annualRewardsRate:
        u64.fromBuffer(decodedData.annualRewardsRate).toNumber() /
        10 ** DEFAULT_TOKEN_DECIMALS,
      totalRewardsShare:
        u64.fromBuffer(decodedData.totalRewardsShares).toNumber() /
        10 ** DEFAULT_TOKEN_DECIMALS,
      mintWrapper: new PublicKey(decodedData.mintWrapper).toString(),
      rewardsTokenMint: new PublicKey(decodedData.rewardsTokenMint).toString(),
      claimFeeTokenAccount: new PublicKey(
        decodedData.claimFeeTokenAccount
      ).toString(),
      maxClaimFeeMillibps: u64
        .fromBuffer(decodedData.maxClaimFeeMillibps)
        .toNumber(),
      pauseAuthority: new PublicKey(decodedData.pauseAuthority).toString(),
      isPaused: decodedData.isPaused === 1,
    });
  } catch (err) {
    console.error(err);
  }
})();

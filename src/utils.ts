import { Metadata } from "@metaplex/js/lib/programs/metadata";
import { Connection, PublicKey } from "@solana/web3.js";
import JSBI from "jsbi";
import Decimal from "decimal.js-light";
import { MintLayout, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";

import {
  HONEY_TOKEN_HARD_CAP,
  DEFAULT_TOKEN_DECIMALS,
  SUPPLY_ONE,
  METADATA_PROGRAM_ID,
} from "./constants";
import BN from "bn.js";

import { programs } from "@metaplex/js";

/**
 * Bigint-like number.
 */
export declare type BigintIsh = JSBI | string | number | bigint | BN;

export function parseTokenHardCap(
  tokenDecimals = DEFAULT_TOKEN_DECIMALS,
  tokenHardCap: string = HONEY_TOKEN_HARD_CAP.toString()
) {
  const tokenHardcapBN = JSBI.BigInt(
    parseBigintIsh(
      parseBigintIsh(
        JSBI.BigInt(
          new Decimal(tokenHardCap)
            .times(new Decimal(10).pow(tokenDecimals))
            .toFixed(0)
        )
      )
    )
  );

  return new u64(tokenHardcapBN.toString());
}

export function parseBigintIsh(bigintIsh: BigintIsh): JSBI {
  return bigintIsh instanceof JSBI
    ? bigintIsh
    : typeof bigintIsh === "bigint" || BN.isBN(bigintIsh)
    ? JSBI.BigInt(bigintIsh.toString())
    : JSBI.BigInt(bigintIsh);
}

export async function getAllNFTsOwned(
  owner: PublicKey,
  connection: Connection
) {
  const { value: tokens } = await connection.getParsedTokenAccountsByOwner(
    owner,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  const nfts: {
    mint: PublicKey;
    metadata: any;
    masterEdition: any;
  }[] = [];

  for (let token of tokens) {
    const {
      info: { mint: mintRaw },
    } = token.account.data.parsed;
    const mint = new PublicKey(mintRaw);
    const mintAccount = await connection.getAccountInfo(mint);
    const mintAccountDecoded = MintLayout.decode(mintAccount?.data);

    if (
      mintAccountDecoded.decimals === 0 &&
      SUPPLY_ONE.equals(mintAccountDecoded.supply)
    ) {
      const [metadataPub, metaBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      if (!(await connection.getAccountInfo(metadataPub))) continue;

      const metadata = await programs.metadata.Metadata.load(
        connection,
        metadataPub
      );

      const [masterEditionPDA, masterBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      );

      if (!(await connection.getAccountInfo(masterEditionPDA))) continue;

      const masterEdition = await programs.metadata.MasterEdition.load(
        connection,
        masterEditionPDA
      );

      nfts.push({
        mint,
        metadata: { ...metadata.data, address: metadataPub, bump: metaBump },
        masterEdition: {
          ...masterEdition.data,
          address: masterEditionPDA,
          bump: masterBump,
        },
      });
    }
  }

  return nfts;
}

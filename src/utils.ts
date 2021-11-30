import JSBI from "jsbi";
import Decimal from "decimal.js-light";
import { u64 } from "@solana/spl-token";

import {
  HONEY_TOKEN_HARD_CAP,
  DEFAULT_TOKEN_DECIMALS,
  MAX_U64,
  ZERO,
} from "./constants";
import BN from "bn.js";

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

import * as anchor from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import fs from "fs-extra";
import { getAnchorProgram, MINER_SECRET_KEY, PROGRAM_IDS } from "../constants";
import { QuarryMineJSON } from "../idls/quarry_mine";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION },
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  const minerAuthWallet = new anchor.Wallet(
    Keypair.fromSecretKey(MINER_SECRET_KEY)
  );

  console.log("Miner Authority:", minerAuthWallet.publicKey.toString());

  const mintWrapperPDARaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/mintWrapperPDA.json`
  );
  const minterPDARaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/minterPDA.json`
  );
  const rewardsMintRaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/rewardsMint.json`
  );
  const rewarderClaimTokenAccountRaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/rewarderPDAFeeToken.json`
  );
  const minerPDARaw = fs.readJSONSync(`${__dirname}/../pubkeys/minerPDA.json`);
  const quarryPDARaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/quarryPDA.json`
  );
  const rewarderPDARaw = fs.readJSONSync(
    `${__dirname}/../pubkeys/rewarderPDA.json`
  );

  if (
    !mintWrapperPDARaw ||
    !minterPDARaw ||
    !rewardsMintRaw ||
    !rewarderClaimTokenAccountRaw ||
    !minerPDARaw ||
    !quarryPDARaw ||
    !rewarderPDARaw
  ) {
    throw new Error("Required accounts not present");
  }

  const mintWrapperPDA = new PublicKey(mintWrapperPDARaw);
  const minterPDA = new PublicKey(minterPDARaw);
  const rewardsMint = new PublicKey(rewardsMintRaw);
  const rewarderClaimTokenAccount = new PublicKey(rewarderClaimTokenAccountRaw);
  const minerPDA = new PublicKey(minerPDARaw);
  const quarryPDA = new PublicKey(quarryPDARaw);
  const rewarderPDA = new PublicKey(rewarderPDARaw);

  const transaction = new Transaction();
  transaction.feePayer = minerAuthWallet.publicKey;
  transaction.recentBlockhash = (
    await SOLANA_CONNECTION.getRecentBlockhash()
  ).blockhash;

  const minerAuthRewardsTokenAcc = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    rewardsMint,
    minerAuthWallet.publicKey,
    false
  );

  if (!(await SOLANA_CONNECTION.getAccountInfo(minerAuthRewardsTokenAcc))) {
    console.log(
      "Creating Rewards Associated Token account for Miner Authority:",
      minerAuthRewardsTokenAcc.toString()
    );

    const createRewardsAssocTokenIx =
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        rewardsMint,
        minerAuthRewardsTokenAcc,
        minerAuthWallet.publicKey,
        minerAuthWallet.publicKey
      );

    transaction.add(createRewardsAssocTokenIx);
  }

  console.log(
    "Claiming Rewards from staking and depositing to:",
    minerAuthRewardsTokenAcc.toString()
  );

  const claimRewardsIx = programInstruction.claimRewards({
    accounts: {
      claimFeeTokenAccount: rewarderClaimTokenAccount,
      mintWrapper: mintWrapperPDA,
      mintWrapperProgram: PROGRAM_IDS["mintWrapper"],
      minter: minterPDA,
      rewardsTokenAccount: minerAuthRewardsTokenAcc,
      rewardsTokenMint: rewardsMint,
      stake: {
        authority: minerAuthWallet.publicKey,
        miner: minerPDA,
        quarry: quarryPDA,
        rewarder: rewarderPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
  });

  transaction.add(claimRewardsIx);

  const signedTransaction = await minerAuthWallet.signTransaction(transaction);
  await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());
})();

import { FULL_SHARE, MONKEY_SPOOK_BOX_SHARE } from "./../constants";
import { config } from "dotenv";
import { QuarryMineJSON } from "./../idls/quarry_mine";

config();

import { getAnchorProgram } from "../constants";
import { getQuarryPDA } from "../pda";
import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION, wallet },
} = getAnchorProgram(QuarryMineJSON, "mine");

const REWARDER_AUTHORITY = wallet.publicKey;
const PAYER = wallet.publicKey;

(async function () {
  // const { rewarderPDA } = await getQuarryPDA();
  const rewarderPDA = new PublicKey(
    "4kk3PYMR1K1xUeVN29ePDDnybrhtCCeqq6HYHj1aeUXF"
  );

  const transaction = new Transaction();

  const _QUARRIES = [
    {
      pda: new PublicKey("GDRoBcN7GaP37GvFuV5ExB9hNBwWSwkW11BnQwgpGW5c"),
      rewardsShare: new BN(10),
    },
    {
      pda: new PublicKey("5DrbHHTFpFj8y4VQbVqcvfES4Pbh9Fs1UUWViZiNihq"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("5XFLVRkyCeFA4w1MB3fXFz1sjB7dFwyxMg66K9pGFqr7"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("6ChXQZSiQr3SCg6YMiY2otp2KhEKuUYut9TW54qAZK7f"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("C5wwqrbN9rffkLiWe6JzK4f3e8ipwckAyrZduZeS6Sra"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("7AifQ3zNafLq42ch2CdUMCgT5fbDeMMihgocwLEgJNh4"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("9ZPUV2FXD4Es5ubZc9eFKX2JW9vXuNyjNtSZ4NYMr7Y8"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("hXB4LvpSSjZ5oMCTQLbuzncnQC5baTj7xSykSQgDN3g"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("FvxbkB9RCsWx5cnSeUXVyU29sfxi8XxhbXpvFJUNh8q5"),
      rewardsShare: new BN(3.33),
    },
    {
      pda: new PublicKey("DatJiBvijkAJJWVhtTeJmeuUAakkdbcsfMbXeiyPL85j"),
      rewardsShare: new BN(3.33),
    },
  ];

  const QUARRIES = [
    {
      pda: new PublicKey("4wuFryBEXiTEPURLjSBtX6U9jp4tn9UoAG3ZdE2p7Ldx"),
      rewardsShare: new BN(0),
    },
    {
      pda: new PublicKey("HVmzEaraJQw9mF1pjaoc67i7FiSvehX1NWBNKDYwtTin"),
      rewardsShare: new BN(0),
    },
    {
      pda: new PublicKey("CeXn4pFCYhd2kX1VRXtt6eJvceqMc1vpZaVn115Qef3P"),
      rewardsShare: new BN(0),
    },
    {
      pda: new PublicKey("4Xd6A3q8jALbJR1qgicPPnzyCoZHeHocyPfNc1ojfBWq"),
      rewardsShare: new BN(0),
    },
  ];

  for (let quarry of QUARRIES) {
    console.log(
      "Setting Quarry Rewards share of:",
      quarry.rewardsShare.toNumber()
    );

    const setQuarryRewardsShareIx = programInstruction.setRewardsShare(
      quarry.rewardsShare,
      {
        accounts: {
          auth: {
            authority: REWARDER_AUTHORITY,
            rewarder: rewarderPDA,
          },
          quarry: quarry.pda,
        },
      }
    );

    transaction.add(setQuarryRewardsShareIx);
  }

  transaction.feePayer = PAYER;
  transaction.recentBlockhash = (
    await SOLANA_CONNECTION.getRecentBlockhash()
  ).blockhash;

  const signedTransaction = await wallet.signTransaction(transaction);

  const txHash = await SOLANA_CONNECTION.sendRawTransaction(
    signedTransaction.serialize()
  );

  await SOLANA_CONNECTION.confirmTransaction(txHash);
  console.log(`Update Quarry Share Tx Hash: ${txHash}`);
  console.log("DONE");
})();

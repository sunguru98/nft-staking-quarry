import { QuarryMineJSON } from "./../idls/quarry_mine";
import { getAnchorProgram } from "../constants";
import { PublicKey, Transaction } from "@solana/web3.js";

const {
  provider: { connection: SOLANA_CONNECTION, wallet },
  instruction: mineInstruction,
} = getAnchorProgram(QuarryMineJSON, "mine");

(async function () {
  try {
    const rewarderPDA = new PublicKey(
      "4kk3PYMR1K1xUeVN29ePDDnybrhtCCeqq6HYHj1aeUXF"
    );

    const QUARRIES = [
      new PublicKey("GDRoBcN7GaP37GvFuV5ExB9hNBwWSwkW11BnQwgpGW5c"),
      new PublicKey("5DrbHHTFpFj8y4VQbVqcvfES4Pbh9Fs1UUWViZiNihq"),
      new PublicKey("5XFLVRkyCeFA4w1MB3fXFz1sjB7dFwyxMg66K9pGFqr7"),
      new PublicKey("6ChXQZSiQr3SCg6YMiY2otp2KhEKuUYut9TW54qAZK7f"),
      new PublicKey("C5wwqrbN9rffkLiWe6JzK4f3e8ipwckAyrZduZeS6Sra"),
      new PublicKey("7AifQ3zNafLq42ch2CdUMCgT5fbDeMMihgocwLEgJNh4"),
      new PublicKey("9ZPUV2FXD4Es5ubZc9eFKX2JW9vXuNyjNtSZ4NYMr7Y8"),
      new PublicKey("hXB4LvpSSjZ5oMCTQLbuzncnQC5baTj7xSykSQgDN3g"),
      new PublicKey("FvxbkB9RCsWx5cnSeUXVyU29sfxi8XxhbXpvFJUNh8q5"),
      new PublicKey("DatJiBvijkAJJWVhtTeJmeuUAakkdbcsfMbXeiyPL85j"),
    ];

    const transaction = new Transaction();
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    console.log("Updating Quarry rewards");
    for (let quarry of QUARRIES) {
      const setQuarryRewardsShareIx = mineInstruction.updateQuarryRewards({
        accounts: {
          quarry: quarry,
          rewarder: rewarderPDA,
        },
      });
      transaction.add(setQuarryRewardsShareIx);
    }

    const signedTransaction = await wallet.signTransaction(transaction);

    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTransaction.serialize()
    );

    await SOLANA_CONNECTION.confirmTransaction(txHash);
    console.log(`Update Quarry Rewards Tx Hash: ${txHash}`);
  } catch (err) {
    console.log(err);
  }
})();

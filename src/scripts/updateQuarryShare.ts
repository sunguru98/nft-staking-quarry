import { config } from 'dotenv';
import fs from 'fs-extra';
import { QuarryMineJSON } from './../idls/quarry_mine';

config();

import {
  BAT_SHARE,
  getAnchorProgram,
  PESKY_PENGUINS_SHARE,
} from '../constants';
import { getQuarryPDA } from '../pda';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

const {
  instruction: programInstruction,
  provider: { connection: SOLANA_CONNECTION, wallet },
} = getAnchorProgram(QuarryMineJSON, 'mine');

const REWARDER_AUTHORITY = wallet.publicKey;
const PAYER = wallet.publicKey;

(async function () {
  const { rewarderPDA } = await getQuarryPDA();

  const transaction = new Transaction();

  const QUARRIES = [
    {
      pda: new PublicKey('CHUotmd6qA4DHcW75GXReUEiQB1hwMqiruedUaqf8aaM'),
      rewardsShare: new BN(0),
    },
  ];

  for (let quarry of QUARRIES) {
    console.log(
      'Setting Quarry Rewards share of:',
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

  await SOLANA_CONNECTION.sendRawTransaction(signedTransaction.serialize());
  console.log('DONE');
})();

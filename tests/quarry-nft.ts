import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { QuarryNft } from '../target/types/quarry_nft';

describe('quarry-nft', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.QuarryNft as Program<QuarryNft>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});

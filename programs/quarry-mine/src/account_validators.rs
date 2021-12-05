//! Validations for various accounts.

use anchor_lang::prelude::*;
use anchor_lang::Key;
use metaplex_token_metadata::ID as metadataProgramID;
use vipers::validate::Validate;
use vipers::{assert_ata, assert_keys_eq};

use crate::addresses;
use crate::{
    AcceptAuthority, ClaimRewards, CreateMiner, CreateQuarry, ExtractFees,
    MutableRewarderWithAuthority, MutableRewarderWithPauseAuthority, NewRewarder,
    ReadOnlyRewarderWithAuthority, SetAnnualRewards, SetFamine, SetPauseAuthority, SetRewardsShare,
    TransferAuthority, UpdateQuarryRewards, UserClaim, UserStake,
};

// --------------------------------
// Rewarder Functions
// --------------------------------

impl<'info> Validate<'info> for NewRewarder<'info> {
    fn validate(&self) -> ProgramResult {
        require!(self.base.is_signer, Unauthorized);

        assert_ata!(
            self.claim_fee_token_account,
            self.rewarder,
            self.rewards_token_mint
        );

        assert_keys_eq!(
            self.mint_wrapper.token_mint,
            self.rewards_token_mint,
            "rewards token mint"
        );

        Ok(())
    }
}

impl<'info> Validate<'info> for SetPauseAuthority<'info> {
    fn validate(&self) -> ProgramResult {
        self.auth.validate()?;
        require!(!self.auth.rewarder.is_paused, Paused);
        Ok(())
    }
}

impl<'info> Validate<'info> for MutableRewarderWithPauseAuthority<'info> {
    fn validate(&self) -> ProgramResult {
        require!(self.pause_authority.is_signer, Unauthorized);
        assert_keys_eq!(
            self.rewarder.pause_authority,
            self.pause_authority,
            "pause_authority"
        );
        Ok(())
    }
}

impl<'info> Validate<'info> for TransferAuthority<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);
        require!(self.authority.is_signer, Unauthorized);
        assert_keys_eq!(self.authority, self.rewarder.authority);
        Ok(())
    }
}

impl<'info> Validate<'info> for AcceptAuthority<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);
        require!(
            self.rewarder.pending_authority != Pubkey::default(),
            PendingAuthorityNotSet
        );
        require!(self.authority.is_signer, Unauthorized);
        Ok(())
    }
}

impl<'info> Validate<'info> for SetAnnualRewards<'info> {
    fn validate(&self) -> ProgramResult {
        self.auth.validate()?;
        require!(!self.auth.rewarder.is_paused, Paused);
        Ok(())
    }
}

// --------------------------------
// Quarry functions
// --------------------------------

impl<'info> Validate<'info> for CreateQuarry<'info> {
    fn validate(&self) -> ProgramResult {
        self.auth.validate()?;
        require!(!self.auth.rewarder.is_paused, Paused);
        Ok(())
    }
}

impl<'info> Validate<'info> for SetRewardsShare<'info> {
    fn validate(&self) -> ProgramResult {
        self.auth.validate()?;
        require!(!self.auth.rewarder.is_paused, Paused);
        assert_keys_eq!(self.quarry.rewarder_key, self.auth.rewarder, "rewarder");
        Ok(())
    }
}

impl<'info> Validate<'info> for SetFamine<'info> {
    fn validate(&self) -> ProgramResult {
        self.auth.validate()?;
        require!(!self.auth.rewarder.is_paused, Paused);
        assert_keys_eq!(self.quarry.rewarder_key, self.auth.rewarder, "rewarder");
        Ok(())
    }
}

impl<'info> Validate<'info> for UpdateQuarryRewards<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);
        assert_keys_eq!(self.quarry.rewarder_key, self.rewarder, "rewarder");
        Ok(())
    }
}

/// --------------------------------
/// Miner functions
/// --------------------------------

impl<'info> Validate<'info> for CreateMiner<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);

        assert_keys_eq!(
            self.nft_update_authority,
            self.quarry.nft_update_authority,
            "nft update authority"
        );

        assert_keys_eq!(self.quarry.rewarder_key, self.rewarder, "rewarder");

        Ok(())
    }
}

impl<'info> UserStake<'info> {
    /// Validates the UserStake.
    pub fn validate(&self, metadata_bump: u8) -> ProgramResult {
        // metadata check
        msg!(
            "Received Metadata Pubkey {}",
            self.token_metadata.key().to_string()
        );

        let expected_metadata = Pubkey::create_program_address(
            &[
                b"metadata",
                &metadataProgramID.to_bytes(),
                &self.token_mint.key().to_bytes(),
                &[metadata_bump],
            ],
            &metadataProgramID,
        )?;

        msg!("Expected Metadata Pubkey {}", expected_metadata.to_string());

        assert_keys_eq!(
            self.token_metadata.to_account_info().key(),
            expected_metadata,
            "miner nft metadata"
        );

        // miner_nft_vault
        assert_ata!(
            *self.miner_nft_vault,
            self.miner,
            *self.token_mint,
            "miner vault"
        );

        // user's staked token_account
        assert_ata!(
            self.token_account,
            self.authority,
            *self.token_mint,
            "authority staked token"
        );

        // rewarder is_paused
        require!(!self.rewarder.is_paused, Paused);
        // authority
        require!(self.authority.is_signer, Unauthorized);
        assert_keys_eq!(self.authority, self.miner.authority, "miner authority");

        // quarry
        assert_keys_eq!(self.miner.quarry_key, self.quarry.key(), "quarry");

        // token account's state owner check
        assert_keys_eq!(self.miner_nft_vault.owner, self.miner, "nft vault owner");
        assert_keys_eq!(self.token_account.owner, self.authority, "token account");

        // nft update authority
        assert_keys_eq!(
            self.token_metadata.update_authority,
            self.miner.nft_update_authority,
            "nft update authority",
        );

        assert_keys_eq!(
            self.token_metadata.update_authority,
            self.quarry.nft_update_authority,
            "nft update authority"
        );

        // rewarder
        assert_keys_eq!(self.quarry.rewarder_key, self.rewarder, "rewarder");

        Ok(())
    }
}

impl<'info> Validate<'info> for ClaimRewards<'info> {
    /// Validates a [ClaimRewards] accounts struct.
    fn validate(&self) -> ProgramResult {
        self.stake.validate()?;
        require!(!self.stake.rewarder.is_paused, Paused);

        assert_keys_eq!(
            self.mint_wrapper.token_mint,
            self.rewards_token_mint,
            "mint_wrapper.token_mint",
        );
        assert_keys_eq!(
            self.minter.minter_authority,
            self.stake.rewarder,
            "minter.minter_authority"
        );

        // rewards_token_mint validate
        assert_keys_eq!(
            self.rewards_token_mint,
            self.stake.rewarder.rewards_token_mint,
            "rewards token mint",
        );
        assert_keys_eq!(
            self.rewards_token_mint.mint_authority.unwrap(),
            *self.mint_wrapper,
            "mint wrapper",
        );

        // rewards_token_account validate
        assert_keys_eq!(
            self.rewards_token_account.mint,
            self.rewards_token_mint,
            "rewards_token_account.mint",
        );

        // claim_fee_token_account validate
        assert_keys_eq!(
            *self.claim_fee_token_account,
            self.stake.rewarder.claim_fee_token_account,
            "claim_fee_token_account"
        );
        assert_keys_eq!(
            self.claim_fee_token_account.mint,
            self.rewards_token_mint,
            "rewards_token_account.mint",
        );

        Ok(())
    }
}

impl<'info> Validate<'info> for UserClaim<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);
        // authority
        require!(self.authority.is_signer, Unauthorized);
        assert_keys_eq!(self.authority, self.miner.authority, "miner authority");

        // quarry
        assert_keys_eq!(self.miner.quarry_key, self.quarry.key(), "quarry");

        // rewarder
        assert_keys_eq!(self.quarry.rewarder_key, self.rewarder, "rewarder");

        Ok(())
    }
}

impl<'info> Validate<'info> for ExtractFees<'info> {
    fn validate(&self) -> ProgramResult {
        require!(!self.rewarder.is_paused, Paused);
        assert_ata!(
            self.claim_fee_token_account,
            self.rewarder,
            self.rewarder.rewards_token_mint
        );

        assert_keys_eq!(
            self.claim_fee_token_account.mint,
            self.rewarder.rewards_token_mint,
            "claim_fee_token_account.mint"
        );
        assert_keys_eq!(
            self.fee_to_token_account.mint,
            self.rewarder.rewards_token_mint,
            "fee_to_token_account.mint"
        );
        assert_keys_eq!(
            self.fee_to_token_account.owner,
            addresses::FEE_TO,
            "fee_to_token_account.owner"
        );
        assert_ata!(
            self.fee_to_token_account,
            addresses::FEE_TO,
            self.rewarder.rewards_token_mint,
            "fee ata"
        );

        Ok(())
    }
}

impl<'info> Validate<'info> for MutableRewarderWithAuthority<'info> {
    fn validate(&self) -> ProgramResult {
        require!(self.authority.is_signer, Unauthorized);
        assert_keys_eq!(self.rewarder.authority, self.authority, "authority");
        Ok(())
    }
}

impl<'info> Validate<'info> for ReadOnlyRewarderWithAuthority<'info> {
    /// Validates the [crate::Rewarder] is correct.
    fn validate(&self) -> ProgramResult {
        require!(self.authority.is_signer, Unauthorized);
        assert_keys_eq!(self.authority, self.rewarder.authority, "authority");
        Ok(())
    }
}

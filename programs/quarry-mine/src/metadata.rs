use anchor_lang::prelude::msg;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::AnchorDeserialize;
use std::io::Write;
use std::ops::Deref;

pub use metaplex_token_metadata::ID;

#[derive(Clone)]
pub struct Metadata(metaplex_token_metadata::state::Metadata);

impl Metadata {
    pub const LEN: usize = metaplex_token_metadata::state::MAX_METADATA_LEN;
}

impl anchor_lang::AccountDeserialize for Metadata {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self, ProgramError> {
        Metadata::try_deserialize_unchecked(buf)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self, ProgramError> {
        msg!("DESERIALZING");
        match metaplex_token_metadata::state::Metadata::deserialize(buf) {
            Ok(data) => Ok(Metadata { 0: data }),
            Err(_) => Err(ProgramError::InvalidAccountData),
        }
    }
}

impl anchor_lang::AccountSerialize for Metadata {
    fn try_serialize<W: Write>(&self, _writer: &mut W) -> Result<(), ProgramError> {
        // no-op
        Ok(())
    }
}

impl anchor_lang::Owner for Metadata {
    fn owner() -> Pubkey {
        ID
    }
}

impl Deref for Metadata {
    type Target = metaplex_token_metadata::state::Metadata;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

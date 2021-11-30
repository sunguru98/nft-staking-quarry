use anchor_lang::solana_program::program_error::ProgramError;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::AnchorDeserialize;
use std::io::Write;

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
        match metaplex_token_metadata::state::Metadata::deserialize(buf) {
            Ok(data) => Ok(Metadata(data)),
            Err(err) => return Err(ProgramError::InvalidAccountData),
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

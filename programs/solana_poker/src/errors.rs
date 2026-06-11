use anchor_lang::prelude::*;

#[error_code]
pub enum PokerError {
    #[msg("Room is full")]
    RoomFull,
    #[msg("Room is not in waiting state")]
    RoomNotWaiting,
    #[msg("Room is not in active game")]
    GameNotActive,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Invalid bet amount")]
    InvalidBet,
    #[msg("Cannot check — must call or raise")]
    CannotCheck,
    #[msg("Insufficient stack")]
    InsufficientStack,
    #[msg("Need at least 2 players to start")]
    NotEnoughPlayers,
    #[msg("Player already in room")]
    AlreadyJoined,
    #[msg("Player not in room")]
    NotInRoom,
    #[msg("Cannot leave during active hand")]
    CannotLeaveDuringHand,
    #[msg("Invalid seat")]
    InvalidSeat,
    #[msg("Betting round not complete")]
    BettingIncomplete,
    #[msg("Invalid game phase")]
    InvalidPhase,
    #[msg("No active players remaining")]
    NoActivePlayers,
    #[msg("Raise must be at least the minimum raise")]
    RaiseTooSmall,
    #[msg("Buy-in amount must be at least 10K $SWSOP")]
    BuyInTooLow,
    #[msg("$SWSOP mint not configured — call configure_mint first")]
    MintNotConfigured,
    #[msg("Token mint does not match program config")]
    InvalidMint,
    #[msg("Maximum 6 players per room")]
    TooManyPlayers,
    #[msg("Not invited to this private table")]
    NotInvited,
    #[msg("Only the table creator can invite")]
    NotTableCreator,
    #[msg("Invite list is full")]
    InviteListFull,
    #[msg("Player already invited")]
    AlreadyInvited,
    #[msg("Cannot invite yourself")]
    CannotInviteSelf,
    #[msg("Hole card reveal invalid")]
    InvalidReveal,
    #[msg("Deck already revealed")]
    DeckAlreadyRevealed,
    #[msg("Deck commitment mismatch")]
    DeckCommitmentMismatch,
    #[msg("Hand state mismatch")]
    InvalidHandState,
}

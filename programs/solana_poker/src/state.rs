use anchor_lang::prelude::*;

pub const MAX_PLAYERS: usize = 6;
pub const COMMUNITY_CARDS: usize = 5;
pub const HOLE_CARDS: usize = 2;

/// Public cash tiers in raw $SWSOP units (6 decimals): 50K, 100K, 250K, 500K, 1M
pub const BUY_IN_TIERS: [u64; 5] = [
    50_000_000_000,
    100_000_000_000,
    250_000_000_000,
    500_000_000_000,
    1_000_000_000_000,
];

/// Minimum private-table buy-in: 10K $SWSOP @ 6 decimals
pub const MIN_PRIVATE_BUY_IN: u64 = 10_000_000_000;

/// 10% rake on private-table pots (basis points: 1000 = 10%)
pub const PRIVATE_RAKE_BPS: u64 = 1000;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum GamePhase {
    Waiting,
    PreFlop,
    Flop,
    Turn,
    River,
    Showdown,
}

impl Default for GamePhase {
    fn default() -> Self {
        GamePhase::Waiting
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PlayerStatus {
    Waiting,
    Active,
    Folded,
    AllIn,
}

impl Default for PlayerStatus {
    fn default() -> Self {
        PlayerStatus::Waiting
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PokerMove {
    Fold,
    Check,
    Call,
    Raise { amount: u64 },
}

#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub swsop_mint: Pubkey,
    pub rooms_initialized: u8,
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1;

    pub fn mint_configured(&self) -> bool {
        self.swsop_mint != Pubkey::default()
    }
}

#[account]
pub struct Room {
    pub buy_in: u64,
    pub tier_index: u8,
    pub player_count: u8,
    pub pot: u64,
    pub phase: GamePhase,
    pub community_cards: [u8; COMMUNITY_CARDS],
    pub community_count: u8,
    pub current_bet: u64,
    pub min_raise: u64,
    pub dealer_seat: u8,
    pub current_turn_seat: u8,
    pub last_raiser_seat: u8,
    pub active_count: u8,
    pub deck: [u8; 52],
    pub deck_pos: u8,
    pub hand_number: u64,
    pub game_seed: u64,
    pub vrf_seed: [u8; 32],
    pub deck_commitment: [u8; 32],
    pub seats: [Pubkey; MAX_PLAYERS],
    pub is_private: bool,
    pub creator: Pubkey,
    pub invited: [Pubkey; MAX_PLAYERS],
    pub bump: u8,
    pub vault_bump: u8,
}

impl Room {
    pub const LEN: usize = 8 + 8 + 1 + 1 + 8 + 1 + 5 + 1 + 8 + 8 + 1 + 1 + 1 + 1 + 52 + 1 + 8 + 8 + 32 + 32 + (32 * MAX_PLAYERS) + 1 + 32 + (32 * MAX_PLAYERS) + 1 + 1;

    pub fn can_join(&self, wallet: &Pubkey) -> bool {
        if !self.is_private {
            return true;
        }
        if *wallet == self.creator {
            return true;
        }
        self.invited.iter().any(|p| *p == *wallet)
    }

    pub fn small_blind(&self) -> u64 {
        self.buy_in / 100
    }

    pub fn big_blind(&self) -> u64 {
        self.buy_in / 50
    }

    pub fn seat_index(&self, player: &Pubkey) -> Option<usize> {
        self.seats
            .iter()
            .position(|s| *s == *player)
    }

    pub fn init_defaults(&mut self, buy_in: u64, tier_index: u8, bump: u8, vault_bump: u8) {
        self.buy_in = buy_in;
        self.tier_index = tier_index;
        self.player_count = 0;
        self.pot = 0;
        self.phase = GamePhase::Waiting;
        self.community_cards = [255; COMMUNITY_CARDS];
        self.community_count = 0;
        self.current_bet = 0;
        self.min_raise = buy_in / 50;
        self.dealer_seat = 0;
        self.current_turn_seat = 0;
        self.last_raiser_seat = 0;
        self.active_count = 0;
        self.deck = crate::game_logic::init_deck();
        self.deck_pos = 0;
        self.hand_number = 0;
        self.game_seed = 0;
        self.vrf_seed = [0u8; 32];
        self.deck_commitment = [0u8; 32];
        self.seats = [Pubkey::default(); MAX_PLAYERS];
        self.is_private = false;
        self.creator = Pubkey::default();
        self.invited = [Pubkey::default(); MAX_PLAYERS];
        self.bump = bump;
        self.vault_bump = vault_bump;
    }
}

#[account]
pub struct Player {
    pub room: Pubkey,
    pub wallet: Pubkey,
    pub seat: u8,
    pub stack: u64,
    pub round_bet: u64,
    pub total_bet: u64,
    pub hole_cards: [u8; HOLE_CARDS],
    pub hole_commitments: [[u8; 32]; HOLE_CARDS],
    pub hole_revealed: bool,
    pub entropy_commitment: [u8; 32],
    pub status: PlayerStatus,
    pub has_acted: bool,
    pub bump: u8,
}

impl Player {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 2 + 64 + 1 + 32 + 1 + 1 + 1;
}

/// Per-hand dealing state: VRF seed, deck commitment, hidden hole cards by seat.
#[account]
pub struct HandState {
    pub room: Pubkey,
    pub hand_number: u64,
    pub vrf_seed: [u8; 32],
    pub deck_commitment: [u8; 32],
    pub deck: [u8; 52],
    pub deck_pos: u8,
    pub hole_by_seat: [[u8; HOLE_CARDS]; MAX_PLAYERS],
    pub deck_revealed: bool,
    pub bump: u8,
}

impl HandState {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 32 + 52 + 1 + (HOLE_CARDS * MAX_PLAYERS) + 1 + 1;
}

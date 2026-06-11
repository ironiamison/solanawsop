use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::slot_hashes::SlotHashes;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

mod account_helpers;
mod errors;
mod game_logic;
mod hand_eval;
mod state;

use account_helpers::{load_hand_state, load_room, read_player, save_room, with_player_mut};

use errors::PokerError;
use game_logic::*;
use state::*;

declare_id!("2EjVHs2eD6fHAh7vjKMff6zuGRM8NnbKGrJqtmnLfPc7");

#[event]
pub struct HoleCardsDealt {
    pub wallet: Pubkey,
    pub card_0: u8,
    pub card_1: u8,
}

#[event]
pub struct HandDealt {
    pub room: Pubkey,
    pub hand_number: u64,
    pub deck_commitment: [u8; 32],
    pub vrf_seed: [u8; 32],
}

#[program]
pub mod solana_poker {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.swsop_mint = Pubkey::default();
        config.rooms_initialized = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Set the $SWSOP SPL mint after pump.fun deploy (authority only, one-time).
    pub fn configure_mint(ctx: Context<ConfigureMint>, mint: Pubkey) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            PokerError::InvalidBet
        );
        require!(
            !ctx.accounts.config.mint_configured(),
            PokerError::InvalidBet
        );
        ctx.accounts.config.swsop_mint = mint;
        Ok(())
    }

    pub fn initialize_room(ctx: Context<InitializeRoom>, tier_index: u8) -> Result<()> {
        require!(tier_index < BUY_IN_TIERS.len() as u8, PokerError::InvalidBet);
        require!(
            ctx.accounts.config.mint_configured(),
            PokerError::MintNotConfigured
        );
        require!(
            ctx.accounts.mint.key() == ctx.accounts.config.swsop_mint,
            PokerError::InvalidMint
        );

        let buy_in = BUY_IN_TIERS[tier_index as usize];
        let room = &mut ctx.accounts.room;
        room.init_defaults(buy_in, tier_index, ctx.bumps.room, ctx.bumps.vault);

        let config = &mut ctx.accounts.config;
        config.rooms_initialized = config
            .rooms_initialized
            .checked_add(1)
            .ok_or(PokerError::InvalidBet)?;

        Ok(())
    }

    pub fn create_private_table(
        ctx: Context<CreatePrivateTable>,
        buy_in: u64,
        table_id: u64,
    ) -> Result<()> {
        require!(buy_in >= MIN_PRIVATE_BUY_IN, PokerError::BuyInTooLow);
        require!(
            ctx.accounts.config.mint_configured(),
            PokerError::MintNotConfigured
        );
        require!(
            ctx.accounts.mint.key() == ctx.accounts.config.swsop_mint,
            PokerError::InvalidMint
        );

        let room = &mut ctx.accounts.room;
        room.init_defaults(buy_in, 255, ctx.bumps.room, ctx.bumps.vault);
        room.is_private = true;
        room.creator = ctx.accounts.creator.key();

        Ok(())
    }

    pub fn invite_player(ctx: Context<InvitePlayer>, invitee: Pubkey) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.is_private, PokerError::InvalidBet);
        require!(
            ctx.accounts.creator.key() == room.creator,
            PokerError::NotTableCreator
        );
        require!(invitee != room.creator, PokerError::CannotInviteSelf);
        require!(
            !room.invited.iter().any(|p| *p == invitee),
            PokerError::AlreadyInvited
        );

        let mut added = false;
        for slot in room.invited.iter_mut() {
            if *slot == Pubkey::default() {
                *slot = invitee;
                added = true;
                break;
            }
        }
        require!(added, PokerError::InviteListFull);

        Ok(())
    }

    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.phase == GamePhase::Waiting, PokerError::RoomNotWaiting);
        require!(room.player_count < MAX_PLAYERS as u8, PokerError::RoomFull);
        require!(
            room.can_join(&ctx.accounts.player_wallet.key()),
            PokerError::NotInvited
        );

        let buy_in = room.buy_in;
        require!(
            ctx.accounts.config.mint_configured(),
            PokerError::MintNotConfigured
        );
        require!(
            ctx.accounts.mint.key() == ctx.accounts.config.swsop_mint,
            PokerError::InvalidMint
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.player_wallet.to_account_info(),
                },
            ),
            buy_in,
        )?;

        let seat = room.player_count as usize;
        room.seats[seat] = ctx.accounts.player_wallet.key();
        room.player_count += 1;

        let player = &mut ctx.accounts.player;
        player.room = room.key();
        player.wallet = ctx.accounts.player_wallet.key();
        player.seat = seat as u8;
        player.stack = buy_in;
        player.round_bet = 0;
        player.total_bet = 0;
        player.hole_cards = [255; HOLE_CARDS];
        player.hole_commitments = [[0u8; 32]; HOLE_CARDS];
        player.hole_revealed = false;
        player.entropy_commitment = [0u8; 32];
        player.status = PlayerStatus::Waiting;
        player.has_acted = false;
        player.bump = ctx.bumps.player;

        Ok(())
    }

    /// Optional pre-hand entropy commit (hash only). Cleared when the hand ends.
    pub fn commit_hand_entropy(
        ctx: Context<CommitHandEntropy>,
        commitment: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.room.phase == GamePhase::Waiting,
            PokerError::RoomNotWaiting
        );
        ctx.accounts.player.entropy_commitment = commitment;
        Ok(())
    }

    pub fn leave_room(ctx: Context<LeaveRoom>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(
            room.phase == GamePhase::Waiting,
            PokerError::CannotLeaveDuringHand
        );

        let player = &ctx.accounts.player;
        let stack = player.stack;
        let seat = player.seat as usize;
        require!(room.seats[seat] == player.wallet, PokerError::NotInRoom);

        let room_key = room.key();
        transfer_tokens_from_vault(
            room_key,
            room.vault_bump,
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.player_token_account.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            stack,
        )?;

        room.seats[seat] = Pubkey::default();
        room.player_count = room.player_count.saturating_sub(1);

        Ok(())
    }

    /// Start a new hand. Pass all seated player accounts as remaining_accounts.
    pub fn start_hand(ctx: Context<StartHand>, next_hand: u64) -> Result<()> {
        let remaining: Vec<AccountInfo> = ctx.remaining_accounts.iter().cloned().collect();
        let room_info = ctx.accounts.room.to_account_info();
        let mut room = load_room(&room_info)?;

        require!(room.phase == GamePhase::Waiting, PokerError::RoomNotWaiting);
        require!(room.player_count >= 2, PokerError::NotEnoughPlayers);
        require!(remaining.len() >= 2, PokerError::NotEnoughPlayers);

        let expected_hand = room.hand_number.checked_add(1).ok_or(PokerError::InvalidBet)?;
        require!(next_hand == expected_hand, PokerError::InvalidHandState);

        let mut entropy: Vec<[u8; 32]> = Vec::new();
        for acc in remaining.iter() {
            let player = read_player(acc)?;
            entropy.push(player.entropy_commitment);
        }

        let slot_hashes = SlotHashes::from_account_info(&ctx.accounts.slot_hashes)?;
        let vrf_seed = vrf_seed_from_slot_hashes(
            &slot_hashes,
            &room_info.key(),
            next_hand,
            room.buy_in,
            &entropy,
        );
        let game_seed = game_seed_from_vrf(&vrf_seed);
        let slot = Clock::get()?.slot;

        let mut deck = init_deck();
        shuffle_deck(&mut deck, game_seed, slot);
        let commitment = deck_commitment(&deck, &vrf_seed);

        room.hand_number = next_hand;
        room.game_seed = game_seed;
        room.vrf_seed = vrf_seed;
        room.deck_commitment = commitment;
        room.deck = deck;
        room.deck_pos = 0;
        room.pot = 0;
        room.community_cards = [255; COMMUNITY_CARDS];
        room.community_count = 0;
        room.current_bet = 0;
        room.min_raise = room.big_blind();
        room.phase = GamePhase::PreFlop;

        let hand_state = &mut ctx.accounts.hand_state;
        hand_state.room = room_info.key();
        hand_state.hand_number = next_hand;
        hand_state.vrf_seed = vrf_seed;
        hand_state.deck_commitment = commitment;
        hand_state.deck = deck;
        hand_state.deck_pos = 0;
        hand_state.hole_by_seat = [[255; HOLE_CARDS]; MAX_PLAYERS];
        hand_state.deck_revealed = false;
        hand_state.bump = ctx.bumps.hand_state;

        let room_key = room_info.key();
        let mut deck_pos = 0u8;
        for acc in remaining.iter() {
            let card_a = deck[deck_pos as usize];
            let card_b = deck[deck_pos as usize + 1];
            deck_pos += 2;

            let p = read_player(acc)?;
            require!(p.room == room_key, PokerError::NotInRoom);
            let seat = p.seat as usize;
            hand_state.hole_by_seat[seat] = [card_a, card_b];

            let salt_a = hole_card_salt(&vrf_seed, p.seat, 0);
            let salt_b = hole_card_salt(&vrf_seed, p.seat, 1);
            let comm_a = hole_card_commitment(card_a, salt_a, &p.wallet, next_hand);
            let comm_b = hole_card_commitment(card_b, salt_b, &p.wallet, next_hand);

            emit!(HoleCardsDealt {
                wallet: p.wallet,
                card_0: card_a,
                card_1: card_b,
            });

            with_player_mut(acc, |player| {
                player.hole_commitments[0] = comm_a;
                player.hole_commitments[1] = comm_b;
                player.status = PlayerStatus::Active;
                player.round_bet = 0;
                player.total_bet = 0;
                player.has_acted = false;
                player.hole_cards = [255; HOLE_CARDS];
                player.hole_revealed = false;
                player.entropy_commitment = [0u8; 32];
                Ok(())
            })?;
        }
        room.deck_pos = deck_pos;
        hand_state.deck_pos = deck_pos;

        emit!(HandDealt {
            room: room_key,
            hand_number: next_hand,
            deck_commitment: commitment,
            vrf_seed,
        });

        room.active_count = remaining.len() as u8;
        room.dealer_seat = ((room.hand_number - 1) % room.player_count as u64) as u8;

        let sb_seat = next_active_seat(&room, room.dealer_seat).unwrap_or(0);
        let bb_seat = next_active_seat(&room, sb_seat).unwrap_or(0);
        let sb_amount = room.small_blind();
        let bb_amount = room.big_blind();

        post_blind_remaining(&mut room, &remaining, sb_seat, sb_amount)?;
        post_blind_remaining(&mut room, &remaining, bb_seat, bb_amount)?;

        room.current_bet = bb_amount;
        room.min_raise = bb_amount;
        room.last_raiser_seat = bb_seat;
        room.current_turn_seat = next_active_seat(&room, bb_seat).unwrap_or(0);

        for acc in remaining.iter() {
            with_player_mut(acc, |player| {
                player.has_acted = player.seat != bb_seat;
                Ok(())
            })?;
        }

        save_room(&room_info, &room)
    }

    /// Reveal hole cards to the player's on-chain account (commitment verified).
    pub fn reveal_hole_cards(ctx: Context<RevealHoleCards>) -> Result<()> {
        require!(
            ctx.accounts.hand_state.room == ctx.accounts.room.key(),
            PokerError::InvalidHandState
        );
        require!(
            ctx.accounts.hand_state.hand_number == ctx.accounts.room.hand_number,
            PokerError::InvalidHandState
        );
        require!(!ctx.accounts.player.hole_revealed, PokerError::InvalidReveal);

        let seat = ctx.accounts.player.seat as usize;
        let cards = ctx.accounts.hand_state.hole_by_seat[seat];
        require!(cards[0] != 255 && cards[1] != 255, PokerError::InvalidReveal);

        let vrf_seed = ctx.accounts.hand_state.vrf_seed;
        let hand_number = ctx.accounts.room.hand_number;
        let wallet = ctx.accounts.player.wallet;
        let salts = [
            hole_card_salt(&vrf_seed, ctx.accounts.player.seat, 0),
            hole_card_salt(&vrf_seed, ctx.accounts.player.seat, 1),
        ];
        require!(
            verify_hole_commitments(
                cards,
                salts,
                ctx.accounts.player.hole_commitments,
                &wallet,
                hand_number,
            ),
            PokerError::InvalidReveal
        );

        ctx.accounts.player.hole_cards = cards;
        ctx.accounts.player.hole_revealed = true;
        Ok(())
    }

    /// Reveal full deck at showdown; verifies deck_commitment.
    pub fn reveal_deck(ctx: Context<RevealDeck>) -> Result<()> {
        require!(
            matches!(
                ctx.accounts.room.phase,
                GamePhase::Showdown | GamePhase::River
            ),
            PokerError::InvalidPhase
        );
        require!(
            ctx.accounts.hand_state.room == ctx.accounts.room.key(),
            PokerError::InvalidHandState
        );
        require!(
            ctx.accounts.hand_state.hand_number == ctx.accounts.room.hand_number,
            PokerError::InvalidHandState
        );
        require!(!ctx.accounts.hand_state.deck_revealed, PokerError::DeckAlreadyRevealed);

        let expected = deck_commitment(&ctx.accounts.hand_state.deck, &ctx.accounts.hand_state.vrf_seed);
        require!(
            expected == ctx.accounts.hand_state.deck_commitment,
            PokerError::DeckCommitmentMismatch
        );

        ctx.accounts.hand_state.deck_revealed = true;
        ctx.accounts.room.deck = ctx.accounts.hand_state.deck;
        Ok(())
    }

    /// Player action: fold, check, call, or raise.
    /// Pass all player accounts as remaining_accounts in seat order.
    pub fn player_action(ctx: Context<PlayerActionCtx>, action: PokerMove) -> Result<()> {
        let remaining: Vec<AccountInfo> = ctx.remaining_accounts.iter().cloned().collect();
        let room_info = ctx.accounts.room.to_account_info();
        let mut room = load_room(&room_info)?;

        require!(
            matches!(
                room.phase,
                GamePhase::PreFlop | GamePhase::Flop | GamePhase::Turn | GamePhase::River
            ),
            PokerError::GameNotActive
        );

        let player_key = ctx.accounts.player_wallet.key();
        require!(
            ctx.accounts.player.wallet == player_key,
            PokerError::NotInRoom
        );
        require!(
            ctx.accounts.player.seat == room.current_turn_seat,
            PokerError::NotYourTurn
        );
        require!(
            ctx.accounts.player.status == PlayerStatus::Active,
            PokerError::NotYourTurn
        );

        match action {
            PokerMove::Fold => {
                ctx.accounts.player.status = PlayerStatus::Folded;
                ctx.accounts.player.has_acted = true;
                room.active_count = room.active_count.saturating_sub(1);
            }
            PokerMove::Check => {
                require!(
                    ctx.accounts.player.round_bet >= room.current_bet,
                    PokerError::CannotCheck
                );
                ctx.accounts.player.has_acted = true;
            }
            PokerMove::Call => {
                let to_call = room.current_bet.saturating_sub(ctx.accounts.player.round_bet);
                let actual = to_call.min(ctx.accounts.player.stack);
                deduct_bet_player(&mut ctx.accounts.player, &mut room, actual)?;
                if ctx.accounts.player.stack == 0 {
                    ctx.accounts.player.status = PlayerStatus::AllIn;
                }
                ctx.accounts.player.has_acted = true;
            }
            PokerMove::Raise { amount } => {
                let to_call = room.current_bet.saturating_sub(ctx.accounts.player.round_bet);
                let total = to_call.saturating_add(amount);
                require!(amount >= room.min_raise, PokerError::RaiseTooSmall);
                require!(total <= ctx.accounts.player.stack, PokerError::InsufficientStack);
                deduct_bet_player(&mut ctx.accounts.player, &mut room, total)?;
                room.current_bet = ctx.accounts.player.round_bet;
                room.min_raise = amount;
                room.last_raiser_seat = ctx.accounts.player.seat;
                if ctx.accounts.player.stack == 0 {
                    ctx.accounts.player.status = PlayerStatus::AllIn;
                }
                ctx.accounts.player.has_acted = true;
                clear_acted_on_raise(&remaining, ctx.accounts.player.seat)?;
            }
        }

        let active = count_active_remaining(&remaining)?;

        if active <= 1 {
            let winner = find_winner_wallet(&remaining)?;
            let pot = room.pot;
            let payout = collect_private_rake(
                &room,
                room_info.key(),
                pot,
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.fee_recipient_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            )?;
            credit_winner_stack(&remaining, &winner, payout)?;
            finish_hand(&mut room, &remaining)?;
            return save_room(&room_info, &room);
        }

        advance_turn_from_remaining(&mut room, &remaining)?;
        let room_key = room_info.key();
        let hand_number = room.hand_number;
        let hole_by_seat =
            hand_holes_from_remaining(room_key, hand_number, ctx.program_id, &remaining)?;
        try_advance_street(
            &mut room,
            &remaining,
            room_key,
            &hole_by_seat,
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.fee_recipient_token_account.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        )?;

        save_room(&room_info, &room)
    }

    /// Advance to next street when betting round is complete.
    pub fn advance_street(ctx: Context<AdvanceStreet>) -> Result<()> {
        let remaining: Vec<AccountInfo> = ctx.remaining_accounts.iter().cloned().collect();
        let room_info = ctx.accounts.room.to_account_info();
        let mut room = load_room(&room_info)?;

        require!(
            matches!(
                room.phase,
                GamePhase::PreFlop | GamePhase::Flop | GamePhase::Turn | GamePhase::River
            ),
            PokerError::GameNotActive
        );
        require!(
            betting_round_complete_remaining(&room, &remaining)?,
            PokerError::BettingIncomplete
        );

        if room.phase == GamePhase::River {
            let room_key = room_info.key();
            let hand_number = room.hand_number;
            let hole_by_seat =
                hand_holes_from_remaining(room_key, hand_number, ctx.program_id, &remaining)?;
            showdown_remaining(
                &mut room,
                &remaining,
                room_key,
                &hole_by_seat,
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.fee_recipient_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            )?;
        } else {
            advance_phase_remaining(&mut room, &remaining)?;
        }

        save_room(&room_info, &room)
    }
}

fn hand_holes_from_remaining(
    room_key: Pubkey,
    hand_number: u64,
    program_id: &Pubkey,
    remaining: &[AccountInfo],
) -> Result<[[u8; HOLE_CARDS]; MAX_PLAYERS]> {
    let (expected, _) = Pubkey::find_program_address(
        &[
            b"hand",
            room_key.as_ref(),
            &hand_number.to_le_bytes(),
        ],
        program_id,
    );
    for acc in remaining {
        if acc.key() == expected {
            let hand = load_hand_state(acc)?;
            require!(hand.room == room_key, PokerError::InvalidHandState);
            require!(hand.hand_number == hand_number, PokerError::InvalidHandState);
            return Ok(hand.hole_by_seat);
        }
    }
    err!(PokerError::InvalidHandState)
}

fn post_blind_remaining(
    room: &mut Room,
    remaining: &[AccountInfo],
    seat: u8,
    amount: u64,
) -> Result<()> {
    for acc in remaining {
        let p = read_player(acc)?;
        if p.seat == seat {
            with_player_mut(acc, |player| {
                let actual = amount.min(player.stack);
                deduct_bet_player(player, room, actual)?;
                if player.stack == 0 {
                    player.status = PlayerStatus::AllIn;
                }
                Ok(())
            })?;
            break;
        }
    }
    Ok(())
}

fn deduct_bet_player(player: &mut Player, room: &mut Room, amount: u64) -> Result<()> {
    require!(amount <= player.stack, PokerError::InsufficientStack);
    player.stack -= amount;
    player.round_bet += amount;
    player.total_bet += amount;
    room.pot += amount;
    Ok(())
}

fn clear_acted_on_raise(remaining: &[AccountInfo], raiser_seat: u8) -> Result<()> {
    for acc in remaining {
        with_player_mut(acc, |player| {
            if player.seat != raiser_seat && player.status == PlayerStatus::Active {
                player.has_acted = false;
            }
            Ok(())
        })?;
    }
    Ok(())
}

fn count_active_remaining(remaining: &[AccountInfo]) -> Result<u8> {
    let mut count = 0u8;
    for acc in remaining {
        let player = read_player(acc)?;
        if player.status == PlayerStatus::Active || player.status == PlayerStatus::AllIn {
            count += 1;
        }
    }
    Ok(count)
}

fn find_winner_wallet(remaining: &[AccountInfo]) -> Result<Pubkey> {
    for acc in remaining {
        let player = read_player(acc)?;
        if player.status == PlayerStatus::Active || player.status == PlayerStatus::AllIn {
            return Ok(player.wallet);
        }
    }
    err!(PokerError::NoActivePlayers)
}

fn credit_winner_stack(remaining: &[AccountInfo], winner: &Pubkey, amount: u64) -> Result<()> {
    for acc in remaining {
        with_player_mut(acc, |player| {
            if player.wallet == *winner {
                player.stack += amount;
            }
            Ok(())
        })?;
    }
    Ok(())
}

fn finish_hand(room: &mut Room, remaining: &[AccountInfo]) -> Result<()> {
    room.pot = 0;
    room.phase = GamePhase::Waiting;
    room.community_count = 0;
    room.community_cards = [255; COMMUNITY_CARDS];
    room.current_bet = 0;
    room.deck_commitment = [0u8; 32];
    room.vrf_seed = [0u8; 32];

    for acc in remaining {
        with_player_mut(acc, |player| {
            player.round_bet = 0;
            player.total_bet = 0;
            player.hole_cards = [255; HOLE_CARDS];
            player.hole_commitments = [[0u8; 32]; HOLE_CARDS];
            player.hole_revealed = false;
            player.entropy_commitment = [0u8; 32];
            player.status = PlayerStatus::Waiting;
            player.has_acted = false;
            Ok(())
        })?;
    }

    Ok(())
}

fn advance_turn_from_remaining(room: &mut Room, remaining: &[AccountInfo]) -> Result<()> {
    let mut seat = room.current_turn_seat;
    for _ in 0..MAX_PLAYERS {
        seat = next_active_seat(room, seat).unwrap_or(seat);
        for acc in remaining {
            let player = read_player(acc)?;
            if player.seat == seat && player.status == PlayerStatus::Active {
                room.current_turn_seat = seat;
                return Ok(());
            }
        }
    }
    Ok(())
}

fn betting_round_complete_remaining(room: &Room, remaining: &[AccountInfo]) -> Result<bool> {
    let mut active_count = 0u8;

    for acc in remaining {
        let player = read_player(acc)?;
        if player.status == PlayerStatus::Active || player.status == PlayerStatus::AllIn {
            active_count += 1;
        }
        if player.status == PlayerStatus::Active {
            if player.round_bet < room.current_bet || !player.has_acted {
                return Ok(false);
            }
        }
    }

    if active_count <= 1 {
        return Ok(true);
    }
    Ok(true)
}

fn try_advance_street<'info>(
    room: &mut Room,
    remaining: &[AccountInfo],
    room_key: Pubkey,
    hole_by_seat: &[[u8; HOLE_CARDS]; MAX_PLAYERS],
    vault_token_account: AccountInfo<'info>,
    fee_recipient_token_account: AccountInfo<'info>,
    vault: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    if !betting_round_complete_remaining(room, remaining)? {
        return Ok(());
    }

    if room.phase == GamePhase::River {
        return showdown_remaining(
            room,
            remaining,
            room_key,
            hole_by_seat,
            vault_token_account,
            fee_recipient_token_account,
            vault,
            token_program,
        );
    }

    advance_phase_remaining(room, remaining)
}

fn advance_phase_remaining(room: &mut Room, remaining: &[AccountInfo]) -> Result<()> {
    room.current_bet = 0;
    room.min_raise = room.big_blind();

    for acc in remaining {
        with_player_mut(acc, |player| {
            if player.status == PlayerStatus::Active || player.status == PlayerStatus::AllIn {
                player.has_acted = false;
                player.round_bet = 0;
            }
            Ok(())
        })?;
    }

    match room.phase {
        GamePhase::PreFlop => {
            room.phase = GamePhase::Flop;
            deal_community(room, 3)?;
        }
        GamePhase::Flop => {
            room.phase = GamePhase::Turn;
            deal_community(room, 1)?;
        }
        GamePhase::Turn => {
            room.phase = GamePhase::River;
            deal_community(room, 1)?;
        }
        GamePhase::River => {
            room.phase = GamePhase::Showdown;
        }
        _ => return err!(PokerError::InvalidPhase),
    }

    room.current_turn_seat = room.dealer_seat;
    advance_turn_from_remaining(room, remaining)?;
    Ok(())
}

fn showdown_remaining<'info>(
    room: &mut Room,
    remaining: &[AccountInfo],
    room_key: Pubkey,
    hole_by_seat: &[[u8; HOLE_CARDS]; MAX_PLAYERS],
    vault_token_account: AccountInfo<'info>,
    fee_recipient_token_account: AccountInfo<'info>,
    vault: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    let mut players: Vec<Player> = Vec::new();
    for acc in remaining {
        players.push(read_player(acc)?);
    }

    let pot = room.pot;
    let payout = collect_private_rake(
        room,
        room_key,
        pot,
        vault_token_account,
        fee_recipient_token_account,
        vault,
        token_program,
    )?;
    let results = resolve_showdown_with_holes(room, &players, hole_by_seat, payout)?;

    for result in results {
        for acc in remaining {
            with_player_mut(acc, |player| {
                if player.wallet == result.winner_wallet {
                    player.stack += result.amount;
                }
                Ok(())
            })?;
        }
    }

    for acc in remaining {
        with_player_mut(acc, |player| {
            let holes = hole_by_seat[player.seat as usize];
            if holes[0] != 255 {
                player.hole_cards = holes;
                player.hole_revealed = true;
            }
            Ok(())
        })?;
    }

    room.pot = 0;
    finish_hand(room, remaining)?;
    Ok(())
}

/// Transfer rake from vault token ATA to fee recipient; return net pot for winners.
fn collect_private_rake<'info>(
    room: &Room,
    room_key: Pubkey,
    pot: u64,
    vault_token_account: AccountInfo<'info>,
    fee_recipient_token_account: AccountInfo<'info>,
    vault: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<u64> {
    if !room.is_private || pot == 0 {
        return Ok(pot);
    }

    let rake = pot
        .checked_mul(PRIVATE_RAKE_BPS)
        .ok_or(PokerError::InvalidBet)?
        .checked_div(10_000)
        .ok_or(PokerError::InvalidBet)?;
    let payout = pot.saturating_sub(rake);

    if rake > 0 {
        transfer_tokens_from_vault(
            room_key,
            room.vault_bump,
            vault_token_account,
            fee_recipient_token_account,
            vault,
            token_program,
            rake,
        )?;
    }

    Ok(payout)
}

fn transfer_tokens_from_vault<'info>(
    room_key: Pubkey,
    vault_bump: u8,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let bump = [vault_bump];
    let seeds: &[&[u8]] = &[b"vault", room_key.as_ref(), &bump];
    let signer = &[seeds];
    token::transfer(
        CpiContext::new_with_signer(
            token_program,
            Transfer {
                from,
                to,
                authority,
            },
            signer,
        ),
        amount,
    )
}

// ─── Account contexts ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfigureMint<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(tier_index: u8)]
pub struct InitializeRoom<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(
        init,
        payer = authority,
        space = Room::LEN,
        seeds = [b"room", &[tier_index][..]],
        bump
    )]
    pub room: Account<'info, Room>,
    /// CHECK: PDA authority for table vault token ATA
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        constraint = mint.key() == config.swsop_mint @ PokerError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(buy_in: u64, table_id: u64)]
pub struct CreatePrivateTable<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(
        init,
        payer = creator,
        space = Room::LEN,
        seeds = [
            b"private_room",
            creator.key().as_ref(),
            &table_id.to_le_bytes()
        ],
        bump
    )]
    pub room: Account<'info, Room>,
    /// CHECK: PDA authority for table vault token ATA
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        constraint = mint.key() == config.swsop_mint @ PokerError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InvitePlayer<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct JoinRoom<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        init,
        payer = player_wallet,
        space = Player::LEN,
        seeds = [b"player", room.key().as_ref(), player_wallet.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub player_wallet: Signer<'info>,
    #[account(
        constraint = mint.key() == config.swsop_mint @ PokerError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = player_token_account.owner == player_wallet.key(),
        constraint = player_token_account.mint == mint.key(),
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.mint == mint.key(),
        constraint = vault_token_account.owner == vault.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: vault PDA signs outbound transfers
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveRoom<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        mut,
        close = player_wallet,
        seeds = [b"player", room.key().as_ref(), player_wallet.key().as_ref()],
        bump = player.bump,
        has_one = room,
        constraint = player.wallet == player_wallet.key() @ PokerError::NotInRoom
    )]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub player_wallet: Signer<'info>,
    #[account(
        mut,
        constraint = player_token_account.owner == player_wallet.key(),
    )]
    pub player_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: vault PDA signs outbound transfers
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CommitHandEntropy<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        mut,
        seeds = [b"player", room.key().as_ref(), player_wallet.key().as_ref()],
        bump = player.bump,
        has_one = room,
        constraint = player.wallet == player_wallet.key() @ PokerError::NotInRoom
    )]
    pub player: Account<'info, Player>,
    pub player_wallet: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(next_hand: u64)]
pub struct StartHand<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        init,
        payer = starter,
        space = HandState::LEN,
        seeds = [b"hand", room.key().as_ref(), &next_hand.to_le_bytes()],
        bump
    )]
    pub hand_state: Account<'info, HandState>,
    /// CHECK: SlotHashes sysvar for VRF entropy
    #[account(address = anchor_lang::solana_program::sysvar::slot_hashes::ID)]
    pub slot_hashes: AccountInfo<'info>,
    #[account(mut)]
    pub starter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealHoleCards<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        seeds = [b"hand", room.key().as_ref(), &room.hand_number.to_le_bytes()],
        bump = hand_state.bump,
        constraint = hand_state.room == room.key() @ PokerError::InvalidHandState
    )]
    pub hand_state: Account<'info, HandState>,
    #[account(
        mut,
        seeds = [b"player", room.key().as_ref(), player_wallet.key().as_ref()],
        bump = player.bump,
        has_one = room,
        constraint = player.wallet == player_wallet.key() @ PokerError::NotInRoom
    )]
    pub player: Account<'info, Player>,
    pub player_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealDeck<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        mut,
        seeds = [b"hand", room.key().as_ref(), &room.hand_number.to_le_bytes()],
        bump = hand_state.bump,
        constraint = hand_state.room == room.key() @ PokerError::InvalidHandState
    )]
    pub hand_state: Account<'info, HandState>,
}

#[derive(Accounts)]
pub struct PlayerActionCtx<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        mut,
        seeds = [b"player", room.key().as_ref(), player_wallet.key().as_ref()],
        bump = player.bump,
        has_one = room
    )]
    pub player: Account<'info, Player>,
    pub player_wallet: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        constraint = vault_token_account.mint == config.swsop_mint @ PokerError::InvalidMint,
        constraint = vault_token_account.owner == vault.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: vault PDA signs rake transfers
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = fee_recipient_token_account.mint == config.swsop_mint @ PokerError::InvalidMint,
        constraint = fee_recipient_token_account.owner == config.authority @ PokerError::InvalidBet,
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdvanceStreet<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        constraint = vault_token_account.mint == config.swsop_mint @ PokerError::InvalidMint,
        constraint = vault_token_account.owner == vault.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: vault PDA signs rake transfers
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = fee_recipient_token_account.mint == config.swsop_mint @ PokerError::InvalidMint,
        constraint = fee_recipient_token_account.owner == config.authority @ PokerError::InvalidBet,
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

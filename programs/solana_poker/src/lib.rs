use anchor_lang::prelude::*;
use anchor_lang::system_program;

mod account_helpers;
mod errors;
mod game_logic;
mod hand_eval;
mod state;

use account_helpers::{load_room, read_player, save_room, with_player_mut};

use errors::PokerError;
use game_logic::*;
use state::*;

declare_id!("2EjVHs2eD6fHAh7vjKMff6zuGRM8NnbKGrJqtmnLfPc7");

#[program]
pub mod solana_poker {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.rooms_initialized = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn initialize_room(ctx: Context<InitializeRoom>, tier_index: u8) -> Result<()> {
        require!(tier_index < BUY_IN_TIERS.len() as u8, PokerError::InvalidBet);

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
        require!(buy_in >= 10_000_000, PokerError::BuyInTooLow);

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
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player_wallet.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
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
        player.status = PlayerStatus::Waiting;
        player.has_acted = false;
        player.bump = ctx.bumps.player;

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

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= stack;
        **ctx
            .accounts
            .player_wallet
            .to_account_info()
            .try_borrow_mut_lamports()? += stack;

        room.seats[seat] = Pubkey::default();
        room.player_count = room.player_count.saturating_sub(1);

        Ok(())
    }

    /// Start a new hand. Pass all seated player accounts as remaining_accounts.
    pub fn start_hand(ctx: Context<StartHand>) -> Result<()> {
        let remaining: Vec<AccountInfo> = ctx.remaining_accounts.iter().cloned().collect();
        let room_info = ctx.accounts.room.to_account_info();
        let mut room = load_room(&room_info)?;

        require!(room.phase == GamePhase::Waiting, PokerError::RoomNotWaiting);
        require!(room.player_count >= 2, PokerError::NotEnoughPlayers);
        require!(remaining.len() >= 2, PokerError::NotEnoughPlayers);

        let slot = Clock::get()?.slot;
        room.hand_number += 1;
        let game_seed = slot
            .wrapping_mul(room.hand_number)
            .wrapping_add(room.buy_in);
        room.game_seed = game_seed;
        room.deck = init_deck();
        shuffle_deck(&mut room.deck, game_seed, slot);
        room.deck_pos = 0;
        room.pot = 0;
        room.community_cards = [255; COMMUNITY_CARDS];
        room.community_count = 0;
        room.current_bet = 0;
        room.min_raise = room.big_blind();
        room.phase = GamePhase::PreFlop;

        let room_key = room_info.key();
        let mut deck_pos = 0u8;
        for acc in remaining.iter() {
            let card_a = room.deck[deck_pos as usize];
            let card_b = room.deck[deck_pos as usize + 1];
            deck_pos += 2;
            with_player_mut(acc, |player| {
                require!(player.room == room_key, PokerError::NotInRoom);
                player.status = PlayerStatus::Active;
                player.round_bet = 0;
                player.total_bet = 0;
                player.has_acted = false;
                player.hole_cards = [card_a, card_b];
                Ok(())
            })?;
        }
        room.deck_pos = deck_pos;

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
                pot,
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.fee_recipient.to_account_info(),
            )?;
            credit_winner_stack(&remaining, &winner, payout)?;
            finish_hand(&mut room, &remaining)?;
            return save_room(&room_info, &room);
        }

        advance_turn_from_remaining(&mut room, &remaining)?;
        try_advance_street(
            &mut room,
            &remaining,
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.fee_recipient.to_account_info(),
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
            showdown_remaining(
                &mut room,
                &remaining,
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.fee_recipient.to_account_info(),
            )?;
        } else {
            advance_phase_remaining(&mut room, &remaining)?;
        }

        save_room(&room_info, &room)
    }
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

    for acc in remaining {
        with_player_mut(acc, |player| {
            player.round_bet = 0;
            player.total_bet = 0;
            player.hole_cards = [255; HOLE_CARDS];
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

fn try_advance_street(
    room: &mut Room,
    remaining: &[AccountInfo],
    vault: &AccountInfo,
    fee_recipient: &AccountInfo,
) -> Result<()> {
    if !betting_round_complete_remaining(room, remaining)? {
        return Ok(());
    }

    if room.phase == GamePhase::River {
        return showdown_remaining(room, remaining, vault, fee_recipient);
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

fn showdown_remaining(
    room: &mut Room,
    remaining: &[AccountInfo],
    vault: &AccountInfo,
    fee_recipient: &AccountInfo,
) -> Result<()> {
    let mut players: Vec<Player> = Vec::new();
    for acc in remaining {
        players.push(read_player(acc)?);
    }

    let pot = room.pot;
    let payout = collect_private_rake(room, pot, vault, fee_recipient)?;
    let results = resolve_showdown_from_data_with_pot(room, &players, payout)?;

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

    room.pot = 0;
    finish_hand(room, remaining)?;
    Ok(())
}

/// Transfer rake from vault to fee recipient; return net pot for winners.
fn collect_private_rake(
    room: &Room,
    pot: u64,
    vault: &AccountInfo,
    fee_recipient: &AccountInfo,
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
        **vault.try_borrow_mut_lamports()? = vault
            .lamports()
            .checked_sub(rake)
            .ok_or(PokerError::InsufficientStack)?;
        **fee_recipient.try_borrow_mut_lamports()? = fee_recipient
            .lamports()
            .checked_add(rake)
            .ok_or(PokerError::InvalidBet)?;
    }

    Ok(payout)
}

fn resolve_showdown_from_data_with_pot(
    room: &Room,
    players: &[Player],
    pot: u64,
) -> Result<Vec<PotResult>> {
    let community: Vec<u8> = room.community_cards[..room.community_count as usize].to_vec();

    let contenders: Vec<&Player> = players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active || p.status == PlayerStatus::AllIn)
        .collect();

    if contenders.is_empty() {
        return err!(PokerError::NoActivePlayers);
    }

    if contenders.len() == 1 {
        return Ok(vec![PotResult {
            winner_wallet: contenders[0].wallet,
            amount: pot,
        }]);
    }

    use crate::hand_eval::{evaluate_hand, HandRank};

    let mut best_rank = HandRank::new(0, [0; 5]);
    let mut winners: Vec<Pubkey> = Vec::new();

    for p in &contenders {
        let rank = evaluate_hand(p.hole_cards, &community);
        if rank > best_rank {
            best_rank = rank;
            winners.clear();
            winners.push(p.wallet);
        } else if rank == best_rank {
            winners.push(p.wallet);
        }
    }

    let share = pot / winners.len() as u64;
    let remainder = pot % winners.len() as u64;

    let mut results = Vec::new();
    for (i, w) in winners.iter().enumerate() {
        let mut amount = share;
        if i == 0 {
            amount += remainder;
        }
        results.push(PotResult {
            winner_wallet: *w,
            amount,
        });
    }
    Ok(results)
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
    /// CHECK: PDA vault for SOL
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(buy_in: u64, table_id: u64)]
pub struct CreatePrivateTable<'info> {
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
    /// CHECK: PDA vault for SOL
    #[account(
        seeds = [b"vault", room.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
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
    /// CHECK: vault PDA
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
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
    /// CHECK: vault
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct StartHand<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    pub starter: Signer<'info>,
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
    /// CHECK: vault PDA holding table SOL
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    /// CHECK: platform fee wallet (must match config authority)
    #[account(
        mut,
        constraint = fee_recipient.key() == config.authority @ PokerError::InvalidBet
    )]
    pub fee_recipient: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct AdvanceStreet<'info> {
    #[account(mut)]
    pub room: Account<'info, Room>,
    /// CHECK: vault PDA holding table SOL
    #[account(
        mut,
        seeds = [b"vault", room.key().as_ref()],
        bump = room.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    /// CHECK: platform fee wallet (must match config authority)
    #[account(
        mut,
        constraint = fee_recipient.key() == config.authority @ PokerError::InvalidBet
    )]
    pub fee_recipient: UncheckedAccount<'info>,
}

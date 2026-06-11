use crate::errors::PokerError;
use crate::hand_eval::{evaluate_hand, HandRank};
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash, hashv};
use anchor_lang::solana_program::sysvar::slot_hashes::SlotHashes;

pub fn init_deck() -> [u8; 52] {
    let mut deck = [0u8; 52];
    for i in 0..52 {
        deck[i] = i as u8;
    }
    deck
}

pub fn shuffle_deck(deck: &mut [u8; 52], seed: u64, slot: u64) {
    let mut state = seed.wrapping_mul(6364136223846793005).wrapping_add(slot);
    for i in (1..52).rev() {
        state = state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1);
        let j = (state % (i as u64 + 1)) as usize;
        deck.swap(i, j);
    }
}

/// VRF-style seed from SlotHashes sysvar + room + hand + optional player entropy commits.
pub fn vrf_seed_from_slot_hashes(
    slot_hashes: &SlotHashes,
    room: &Pubkey,
    hand_number: u64,
    buy_in: u64,
    entropy: &[[u8; 32]],
) -> [u8; 32] {
    let hand_bytes = hand_number.to_le_bytes();
    let buy_in_bytes = buy_in.to_le_bytes();
    let mut blob: Vec<u8> = Vec::new();
    blob.extend_from_slice(room.as_ref());
    blob.extend_from_slice(&hand_bytes);
    blob.extend_from_slice(&buy_in_bytes);
    for e in entropy {
        if *e != [0u8; 32] {
            blob.extend_from_slice(e);
        }
    }
    for (slot, entry_hash) in slot_hashes.iter().take(12) {
        blob.extend_from_slice(&slot.to_le_bytes());
        blob.extend_from_slice(entry_hash.as_ref());
    }
    hash(&blob).to_bytes()
}

pub fn game_seed_from_vrf(vrf_seed: &[u8; 32]) -> u64 {
    u64::from_le_bytes(vrf_seed[0..8].try_into().unwrap())
}

pub fn deck_commitment(deck: &[u8; 52], vrf_seed: &[u8; 32]) -> [u8; 32] {
    let deck_hash = hash(deck);
    hashv(&[deck_hash.as_ref(), vrf_seed.as_ref()]).to_bytes()
}

pub fn hole_card_salt(vrf_seed: &[u8; 32], seat: u8, card_index: u8) -> u64 {
    let h = hashv(&[vrf_seed.as_ref(), &[seat], &[card_index]]);
    u64::from_le_bytes(h.to_bytes()[0..8].try_into().unwrap())
}

pub fn hole_card_commitment(
    card: u8,
    salt: u64,
    wallet: &Pubkey,
    hand_number: u64,
) -> [u8; 32] {
    let salt_bytes = salt.to_le_bytes();
    let hand_bytes = hand_number.to_le_bytes();
    hashv(&[&[card], &salt_bytes, wallet.as_ref(), &hand_bytes]).to_bytes()
}

pub fn verify_hole_commitments(
    cards: [u8; HOLE_CARDS],
    salts: [u64; HOLE_CARDS],
    commitments: [[u8; 32]; HOLE_CARDS],
    wallet: &Pubkey,
    hand_number: u64,
) -> bool {
    for i in 0..HOLE_CARDS {
        let expected = hole_card_commitment(cards[i], salts[i], wallet, hand_number);
        if expected != commitments[i] {
            return false;
        }
    }
    true
}

pub fn reset_round_flags(players: &mut [Account<Player>]) -> Result<()> {
    for p in players.iter_mut() {
        if p.status == PlayerStatus::Active || p.status == PlayerStatus::AllIn {
            p.has_acted = false;
            p.round_bet = 0;
        }
    }
    Ok(())
}

pub fn count_active(players: &[Account<Player>]) -> u8 {
    players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active || p.status == PlayerStatus::AllIn)
        .count() as u8
}

pub fn count_can_act(players: &[Account<Player>]) -> u8 {
    players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active)
        .count() as u8
}

pub fn betting_round_complete(room: &Room, players: &[Account<Player>]) -> bool {
    let active: Vec<_> = players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active || p.status == PlayerStatus::AllIn)
        .collect();

    if active.len() <= 1 {
        return true;
    }

    let can_act: Vec<_> = players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active)
        .collect();

    if can_act.is_empty() {
        return true;
    }

    for p in &can_act {
        if p.round_bet < room.current_bet || !p.has_acted {
            return false;
        }
    }

    // Everyone who can act has matched the bet and acted
    true
}

pub fn next_active_seat(room: &Room, from: u8) -> Option<u8> {
    for offset in 1..=MAX_PLAYERS as u8 {
        let seat = (from + offset) % MAX_PLAYERS as u8;
        if room.seats[seat as usize] != Pubkey::default() {
            return Some(seat);
        }
    }
    None
}

pub fn advance_turn(room: &mut Room, players: &[Account<Player>]) -> Result<()> {
    let mut seat = room.current_turn_seat;
    for _ in 0..MAX_PLAYERS {
        seat = next_active_seat(room, seat).unwrap_or(seat);
        let player_key = room.seats[seat as usize];
        if player_key == Pubkey::default() {
            break;
        }
        if let Some(p) = players.iter().find(|p| p.wallet == player_key) {
            if p.status == PlayerStatus::Active {
                room.current_turn_seat = seat;
                return Ok(());
            }
        }
        if seat == room.current_turn_seat {
            break;
        }
    }
    Ok(())
}

pub fn deal_community(room: &mut Room, count: u8) -> Result<()> {
    for _ in 0..count {
        require!(room.deck_pos < 52, PokerError::InvalidPhase);
        require!(
            (room.community_count as usize) < COMMUNITY_CARDS,
            PokerError::InvalidPhase
        );
        room.community_cards[room.community_count as usize] = room.deck[room.deck_pos as usize];
        room.community_count += 1;
        room.deck_pos += 1;
    }
    Ok(())
}

pub fn advance_phase(room: &mut Room, players: &mut [Account<Player>]) -> Result<()> {
    room.current_bet = 0;
    room.min_raise = room.big_blind();
    reset_round_flags(players)?;

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

    // Set first to act post-flop (left of dealer among active)
    room.current_turn_seat = room.dealer_seat;
    advance_turn(room, players)?;
    Ok(())
}

pub struct PotResult {
    pub winner_wallet: Pubkey,
    pub amount: u64,
}

pub fn resolve_showdown_with_holes(
    room: &Room,
    players: &[Player],
    hole_by_seat: &[[u8; HOLE_CARDS]; MAX_PLAYERS],
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

    let mut best_rank = HandRank::new(0, [0; 5]);
    let mut winners: Vec<Pubkey> = Vec::new();

    for p in &contenders {
        let holes = hole_by_seat[p.seat as usize];
        let rank = evaluate_hand(holes, &community);
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

pub fn resolve_showdown(room: &Room, players: &[Account<Player>]) -> Result<Vec<PotResult>> {
    let community: Vec<u8> = room.community_cards[..room.community_count as usize].to_vec();

    let contenders: Vec<_> = players
        .iter()
        .filter(|p| p.status == PlayerStatus::Active || p.status == PlayerStatus::AllIn)
        .collect();

    if contenders.is_empty() {
        return err!(PokerError::NoActivePlayers);
    }

    if contenders.len() == 1 {
        return Ok(vec![PotResult {
            winner_wallet: contenders[0].wallet,
            amount: room.pot,
        }]);
    }

    // Build side pots from total_bet amounts
    let mut contributions: Vec<(Pubkey, u64)> = contenders
        .iter()
        .map(|p| (p.wallet, p.total_bet))
        .collect();
    contributions.sort_by_key(|(_, amt)| *amt);

    let mut pots: Vec<(u64, Vec<Pubkey>)> = Vec::new();
    let mut prev_level = 0u64;

    for i in 0..contributions.len() {
        let level = contributions[i].1;
        if level <= prev_level {
            continue;
        }
        let increment = level - prev_level;
        let eligible: Vec<Pubkey> = contributions
            .iter()
            .filter(|(_, amt)| *amt >= level)
            .map(|(w, _)| *w)
            .collect();
        let pot_amount = increment * eligible.len() as u64;
        if pot_amount > 0 {
            pots.push((pot_amount, eligible));
        }
        prev_level = level;
    }

    // If no side pots formed, single pot
    if pots.is_empty() {
        pots.push((
            room.pot,
            contenders.iter().map(|p| p.wallet).collect(),
        ));
    }

    let mut results = Vec::new();
    let mut distributed = 0u64;

    for (pot_amount, eligible) in pots {
        let mut best_rank = HandRank::new(0, [0; 5]);
        let mut winners: Vec<Pubkey> = Vec::new();

        for wallet in &eligible {
            if let Some(p) = players.iter().find(|p| p.wallet == *wallet) {
                if p.status == PlayerStatus::Folded {
                    continue;
                }
                let rank = evaluate_hand(p.hole_cards, &community);
                if rank > best_rank {
                    best_rank = rank;
                    winners.clear();
                    winners.push(*wallet);
                } else if rank == best_rank {
                    winners.push(*wallet);
                }
            }
        }

        if winners.is_empty() {
            continue;
        }

        let share = pot_amount / winners.len() as u64;
        let remainder = pot_amount % winners.len() as u64;
        for (i, w) in winners.iter().enumerate() {
            let mut amount = share;
            if i == 0 {
                amount += remainder;
            }
            if amount > 0 {
                results.push(PotResult {
                    winner_wallet: *w,
                    amount,
                });
                distributed += amount;
            }
        }
    }

    // Any undistributed pot (rounding) goes to first winner
    if distributed < room.pot && !results.is_empty() {
        results[0].amount += room.pot - distributed;
    }

    Ok(results)
}

pub fn award_fold_win(room: &Room, winner: &Pubkey) -> PotResult {
    PotResult {
        winner_wallet: *winner,
        amount: room.pot,
    }
}

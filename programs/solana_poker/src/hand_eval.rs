/// Texas Hold'em hand evaluation for 7 cards (2 hole + 5 community).
/// Cards are encoded 0-51: rank = card % 13 (0=2..12=A), suit = card / 13 (0-3).

const RANKS: usize = 13;
const SUITS: usize = 4;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub struct HandRank {
    pub category: u8,
    pub kickers: [u8; 5],
}

impl HandRank {
    pub fn new(category: u8, kickers: [u8; 5]) -> Self {
        Self { category, kickers }
    }
}

pub fn evaluate_hand(hole: [u8; 2], community: &[u8]) -> HandRank {
    let mut cards = [0u8; 7];
    cards[0] = hole[0];
    cards[1] = hole[1];
    let mut n = 2usize;
    for &c in community {
        if c < 52 {
            cards[n] = c;
            n += 1;
        }
    }

    let mut best = HandRank::new(0, [0; 5]);
    let indices = [0usize, 1, 2, 3, 4, 5, 6];
    for i in 0..n {
        for j in (i + 1)..n {
            for k in (j + 1)..n {
                for l in (k + 1)..n {
                    for m in (l + 1)..n {
                        let five = [
                            cards[indices[i]],
                            cards[indices[j]],
                            cards[indices[k]],
                            cards[indices[l]],
                            cards[indices[m]],
                        ];
                        let rank = evaluate_five(&five);
                        if rank > best {
                            best = rank;
                        }
                    }
                }
            }
        }
    }
    best
}

fn card_rank(card: u8) -> u8 {
    card % 13
}

fn card_suit(card: u8) -> u8 {
    card / 13
}

fn evaluate_five(cards: &[u8; 5]) -> HandRank {
    let mut ranks = [0u8; 5];
    let mut suits = [0u8; 5];
    for (i, &c) in cards.iter().enumerate() {
        ranks[i] = card_rank(c);
        suits[i] = card_suit(c);
    }
    ranks.sort_unstable_by(|a, b| b.cmp(a));

    let mut rank_counts = [0u8; RANKS];
    let mut suit_counts = [0u8; SUITS];
    for &r in &ranks {
        rank_counts[r as usize] += 1;
    }
    for &s in &suits {
        suit_counts[s as usize] += 1;
    }

    let is_flush = suit_counts.iter().any(|&c| c >= 5);
    let straight_high = find_straight_high(&rank_counts);

    if is_flush && straight_high.is_some() {
        let high = straight_high.unwrap();
        if high == 12 {
            return HandRank::new(9, [12, 0, 0, 0, 0]); // Royal flush
        }
        return HandRank::new(8, [high, 0, 0, 0, 0]); // Straight flush
    }

    let mut quads = None;
    let mut trips = None;
    let mut pairs: [u8; 2] = [255, 255];
    let mut pair_count = 0usize;
    for r in (0..RANKS).rev() {
        let count = rank_counts[r];
        if count == 4 {
            quads = Some(r as u8);
        } else if count == 3 && trips.is_none() {
            trips = Some(r as u8);
        } else if count == 2 && pair_count < 2 {
            pairs[pair_count] = r as u8;
            pair_count += 1;
        }
    }

    if let Some(q) = quads {
        let kicker = (0..RANKS).rev().find(|&r| rank_counts[r] > 0 && r as u8 != q).unwrap() as u8;
        return HandRank::new(7, [q, kicker, 0, 0, 0]);
    }

    if let Some(t) = trips {
        if pair_count >= 1 {
            return HandRank::new(6, [t, pairs[0], 0, 0, 0]); // Full house
        }
    }

    if is_flush {
        return HandRank::new(5, ranks);
    }

    if let Some(high) = straight_high {
        return HandRank::new(4, [high, 0, 0, 0, 0]);
    }

    if let Some(t) = trips {
        let mut kickers = [0u8; 2];
        let mut ki = 0;
        for r in (0..RANKS).rev() {
            if rank_counts[r] > 0 && r as u8 != t && ki < 2 {
                kickers[ki] = r as u8;
                ki += 1;
            }
        }
        return HandRank::new(3, [t, kickers[0], kickers[1], 0, 0]);
    }

    if pair_count >= 2 {
        let high_pair = pairs[0].max(pairs[1]);
        let low_pair = pairs[0].min(pairs[1]);
        let kicker = (0..RANKS)
            .rev()
            .find(|&r| rank_counts[r] > 0 && r as u8 != high_pair && r as u8 != low_pair)
            .unwrap() as u8;
        return HandRank::new(2, [high_pair, low_pair, kicker, 0, 0]);
    }

    if pair_count == 1 {
        let pair = pairs[0];
        let mut kickers = [0u8; 3];
        let mut ki = 0;
        for r in (0..RANKS).rev() {
            if rank_counts[r] > 0 && r as u8 != pair && ki < 3 {
                kickers[ki] = r as u8;
                ki += 1;
            }
        }
        return HandRank::new(1, [pair, kickers[0], kickers[1], kickers[2], 0]);
    }

    HandRank::new(0, ranks)
}

fn find_straight_high(rank_counts: &[u8; RANKS]) -> Option<u8> {
    // Wheel: A-2-3-4-5
    if rank_counts[12] > 0
        && rank_counts[0] > 0
        && rank_counts[1] > 0
        && rank_counts[2] > 0
        && rank_counts[3] > 0
    {
        return Some(3); // 5-high straight
    }

    for high in (4..RANKS).rev() {
        let mut ok = true;
        for i in 0..5 {
            if rank_counts[high - 4 + i] == 0 {
                ok = false;
                break;
            }
        }
        if ok {
            return Some(high as u8);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card(rank: u8, suit: u8) -> u8 {
        suit * 13 + rank
    }

    #[test]
    fn test_pair_beats_high_card() {
        let hole = [card(0, 0), card(0, 1)]; // pair of 2s
        let community = [card(12, 0), card(11, 1), card(10, 2), card(9, 3), card(8, 0)];
        let rank = evaluate_hand(hole, &community);
        assert_eq!(rank.category, 1);
    }
}

const RANKS = 13;

export interface HandRank {
  category: number;
  kickers: [number, number, number, number, number];
}

function cardRank(card: number): number {
  return card % 13;
}

function cardSuit(card: number): number {
  return Math.floor(card / 13);
}

function findStraightHigh(rankCounts: number[]): number | null {
  if (
    rankCounts[12] > 0 &&
    rankCounts[0] > 0 &&
    rankCounts[1] > 0 &&
    rankCounts[2] > 0 &&
    rankCounts[3] > 0
  ) {
    return 3;
  }
  for (let high = RANKS - 1; high >= 4; high--) {
    let ok = true;
    for (let i = 0; i < 5; i++) {
      if (rankCounts[high - 4 + i] === 0) {
        ok = false;
        break;
      }
    }
    if (ok) return high;
  }
  return null;
}

function evaluateFive(cards: number[]): HandRank {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);
  const rankCounts = new Array(RANKS).fill(0);
  const suitCounts = [0, 0, 0, 0];
  for (const r of ranks) rankCounts[r]++;
  for (const s of suits) suitCounts[s]++;

  const isFlush = suitCounts.some((c) => c >= 5);
  const straightHigh = findStraightHigh(rankCounts);

  if (isFlush && straightHigh !== null) {
    if (straightHigh === 12) return { category: 9, kickers: [12, 0, 0, 0, 0] };
    return { category: 8, kickers: [straightHigh, 0, 0, 0, 0] };
  }

  let quads: number | null = null;
  let trips: number | null = null;
  const pairs: number[] = [];
  for (let r = RANKS - 1; r >= 0; r--) {
    const count = rankCounts[r];
    if (count === 4) quads = r;
    else if (count === 3 && trips === null) trips = r;
    else if (count === 2 && pairs.length < 2) pairs.push(r);
  }

  if (quads !== null) {
    const kicker = [...Array(RANKS).keys()]
      .reverse()
      .find((r) => rankCounts[r] > 0 && r !== quads)!;
    return { category: 7, kickers: [quads, kicker, 0, 0, 0] };
  }

  if (trips !== null && pairs.length >= 1) {
    return { category: 6, kickers: [trips, pairs[0], 0, 0, 0] };
  }

  if (isFlush) {
    return { category: 5, kickers: [ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]] };
  }

  if (straightHigh !== null) {
    return { category: 4, kickers: [straightHigh, 0, 0, 0, 0] };
  }

  if (trips !== null) {
    const kickers: number[] = [];
    for (let r = RANKS - 1; r >= 0 && kickers.length < 2; r--) {
      if (rankCounts[r] > 0 && r !== trips) kickers.push(r);
    }
    return { category: 3, kickers: [trips, kickers[0], kickers[1], 0, 0] };
  }

  if (pairs.length >= 2) {
    const highPair = Math.max(pairs[0], pairs[1]);
    const lowPair = Math.min(pairs[0], pairs[1]);
    const kicker = [...Array(RANKS).keys()]
      .reverse()
      .find((r) => rankCounts[r] > 0 && r !== highPair && r !== lowPair)!;
    return { category: 2, kickers: [highPair, lowPair, kicker, 0, 0] };
  }

  if (pairs.length === 1) {
    const kickers: number[] = [];
    for (let r = RANKS - 1; r >= 0 && kickers.length < 3; r--) {
      if (rankCounts[r] > 0 && r !== pairs[0]) kickers.push(r);
    }
    return { category: 1, kickers: [pairs[0], kickers[0], kickers[1], kickers[2], 0] };
  }

  return { category: 0, kickers: [ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]] };
}

function compareRank(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < 5; i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < 5; i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}

export function evaluateHand(hole: [number, number], community: number[]): HandRank {
  const cards = [hole[0], hole[1], ...community.filter((c) => c < 52)];
  let best: HandRank = { category: 0, kickers: [0, 0, 0, 0, 0] };

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        for (let l = k + 1; l < cards.length; l++) {
          for (let m = l + 1; m < cards.length; m++) {
            const five = [cards[i], cards[j], cards[k], cards[l], cards[m]];
            const rank = evaluateFive(five);
            if (compareRank(rank, best) > 0) best = rank;
          }
        }
      }
    }
  }
  return best;
}

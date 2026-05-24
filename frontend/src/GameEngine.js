// ─────────────────────────────────────────────────────────────────────────────
// 29 Card Game — Engine
// Deck: 32 cards (7 8 9 10 J Q K A in 4 suits)
// Rank order (high→low): J 9 A 10 K Q 8 7
// Points: J=3, 9=2, A=1, 10=1, K=Q=8=7=0   Total card pts = 28, +1 last trick = 29
// Teams: NS = players 0 & 2 | EW = players 1 & 3
// ─────────────────────────────────────────────────────────────────────────────

export const SUITS = ['♥', '♠', '♦', '♣'];
export const SUIT_NAMES = { '♥': 'Hearts', '♠': 'Spades', '♦': 'Diamonds', '♣': 'Clubs' };

// Rank order index 0 = highest
export const RANK_ORDER = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

export const RANK_POINTS = {
  J: 3, '9': 2, A: 1, '10': 1,
  K: 0, Q: 0, '8': 0, '7': 0,
};

export function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

// ── Deck ─────────────────────────────────────────────────────────────────────

export function makeDeck() {
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  return deck; // 32 cards
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Card Strength ─────────────────────────────────────────────────────────────

export function cardStrength(card, ledSuit, trump) {
  if (card.suit === trump)    return 100 + (7 - RANK_ORDER.indexOf(card.rank));
  if (card.suit === ledSuit)  return  50 + (7 - RANK_ORDER.indexOf(card.rank));
  return 0;
}

// ── Trick winner ──────────────────────────────────────────────────────────────

export function trickWinner(played, leader, ledSuit, trump) {
  let best = leader, bestStr = -1;
  for (let i = 0; i < 4; i++) {
    if (!played[i]) continue;
    const s = cardStrength(played[i], ledSuit, trump);
    if (s > bestStr) { bestStr = s; best = i; }
  }
  return best;
}

// ── Valid plays ───────────────────────────────────────────────────────────────
// Returns array of valid card indices from `hand`.

export function validCardIndices(hand, ledSuit, trump, trumpRevealed) {
  if (!ledSuit) return hand.map((_, i) => i); // leading — play anything

  const followSuit = hand.map((_, i) => i).filter(i => hand[i].suit === ledSuit);
  if (followSuit.length > 0) return followSuit; // must follow suit

  // Cannot follow suit
  if (trumpRevealed && trump) {
    const trumpCards = hand.map((_, i) => i).filter(i => hand[i].suit === trump);
    if (trumpCards.length > 0) return trumpCards; // must play trump if unable to follow
  }

  return hand.map((_, i) => i); // any card
}

// ── Initialise game state ────────────────────────────────────────────────────

export function initializeGame() {
  return {
    // Lobby
    phase: 'lobby',          // lobby | bidding | trump | playing | result
    roomCode: '',
    isHost: false,
    myIndex: 0,              // which seat am I (0=South/bottom)
    players: ['', '', '', ''],

    // Round state
    dealer: 0,
    hands: [[], [], [], []],         // current 8-card hands (after 2nd deal)
    firstHands: [[], [], [], []],    // first 4 dealt (bidding phase)
    secondBatch: [[], [], [], []],   // second 4 (added after trump chosen)

    // Bidding
    highestBid: 15,
    bids: [0, 0, 0, 0],
    consecutivePasses: 0,
    bidder: -1,

    // Trump
    trump: null,
    trumpName: '',
    trumpRevealed: false,

    // Trick play
    currentPlayer: 0,
    trickLeader: 0,
    trickSuit: null,
    played: [null, null, null, null],
    trickWins: [0, 0, 0, 0],
    trickPts: [0, 0, 0, 0],
    lastTrickWinner: -1,
    selectedCard: null,

    // Scoring (rounds won)
    scores: { NS: 0, EW: 0 },
    roundResult: null,
  };
}

// ── Deal ─────────────────────────────────────────────────────────────────────

export function dealCards(state) {
  const deck = shuffle(makeDeck());
  const startFrom = (state.dealer + 1) % 4;
  const firstHands = [[], [], [], []];
  const secondBatch = [[], [], [], []];

  for (let i = 0; i < 16; i++) firstHands[(startFrom + i) % 4].push(deck[i]);
  for (let i = 16; i < 32; i++) secondBatch[(startFrom + i) % 4].push(deck[i]);

  return {
    ...state,
    firstHands,
    secondBatch,
    hands: firstHands.map(h => [...h]), // hands start as first 4
  };
}

export function dealSecondFour(state) {
  return {
    ...state,
    hands: state.firstHands.map((h, i) => [...h, ...state.secondBatch[i]]),
  };
}

// ── New Round ─────────────────────────────────────────────────────────────────

export function startNewRound(state) {
  let next = dealCards({
    ...state,
    phase: 'bidding',
    highestBid: 15,
    bids: [0, 0, 0, 0],
    consecutivePasses: 0,
    bidder: -1,
    trump: null,
    trumpName: '',
    trumpRevealed: false,
    trickLeader: (state.dealer + 1) % 4,
    currentPlayer: (state.dealer + 1) % 4,
    played: [null, null, null, null],
    trickWins: [0, 0, 0, 0],
    trickPts: [0, 0, 0, 0],
    lastTrickWinner: -1,
    selectedCard: null,
    trickSuit: null,
    roundResult: null,
  });
  return next;
}

// ── Handle bid ────────────────────────────────────────────────────────────────

export function applyBid(state, playerIdx, value) {
  let s = { ...state };
  s.bids = [...s.bids];
  s.bids[playerIdx] = value;

  if (value === 0) {
    s.consecutivePasses = s.consecutivePasses + 1;
  } else {
    s.highestBid = value;
    s.bidder = playerIdx;
    s.consecutivePasses = 0;
  }

  // Bidding ends on 3 consecutive passes
  if (s.consecutivePasses >= 3) {
    if (s.bidder === -1) {
      // Nobody bid — forced bid at 16 to player after dealer
      s.bidder = (s.dealer + 1) % 4;
      s.highestBid = 16;
    }
    s.phase = 'trump';
    return s;
  }

  s.currentPlayer = (playerIdx + 1) % 4;
  return s;
}

// ── Handle trump choice ───────────────────────────────────────────────────────

export function applyTrump(state, suit) {
  let s = dealSecondFour({
    ...state,
    trump: suit,
    trumpName: SUIT_NAMES[suit],
    phase: 'playing',
  });
  s.currentPlayer = s.trickLeader;
  return s;
}

// ── Handle card play ──────────────────────────────────────────────────────────

export function applyPlay(state, playerIdx, cardIdx) {
  let s = { ...state };
  const card = s.hands[playerIdx][cardIdx];
  if (!card) return s;

  // Reveal trump if trump card played
  if (card.suit === s.trump && !s.trumpRevealed) {
    s.trumpRevealed = true;
  }

  s.hands = s.hands.map((h, i) =>
    i === playerIdx ? h.filter((_, j) => j !== cardIdx) : [...h]
  );
  s.played = [...s.played];
  s.played[playerIdx] = card;
  if (!s.trickSuit) s.trickSuit = card.suit;
  s.selectedCard = null;

  return s;
}

// ── Resolve trick ─────────────────────────────────────────────────────────────

export function resolveTrick(state) {
  const winner = trickWinner(state.played, state.trickLeader, state.trickSuit, state.trump);
  const pts = state.played.reduce((sum, c) => sum + (c ? RANK_POINTS[c.rank] : 0), 0);

  const trickWins = [...state.trickWins];
  const trickPts  = [...state.trickPts];
  trickWins[winner]++;
  trickPts[winner] += pts;

  const handsEmpty = state.hands[0].length === 0;

  return {
    ...state,
    trickWins,
    trickPts,
    lastTrickWinner: winner,
    played: [null, null, null, null],
    trickSuit: null,
    trickLeader: winner,
    currentPlayer: winner,
    winnerOfLastTrick: winner,
    trickJustResolved: winner,
    trickJustPts: pts,
    roundComplete: handsEmpty,
  };
}

// ── End round ─────────────────────────────────────────────────────────────────

export function endRound(state) {
  // +1 point for last trick
  const trickPts = [...state.trickPts];
  trickPts[state.lastTrickWinner] += 1;

  const teamPts = {
    NS: trickPts[0] + trickPts[2],
    EW: trickPts[1] + trickPts[3],
  };

  const bidTeam = state.bidder % 2 === 0 ? 'NS' : 'EW';
  const otherTeam = bidTeam === 'NS' ? 'EW' : 'NS';
  const bidderMet = teamPts[bidTeam] >= state.highestBid;

  const scores = { ...state.scores };
  if (bidderMet) scores[bidTeam]++;
  else scores[otherTeam]++;

  return {
    ...state,
    trickPts,
    scores,
    dealer: (state.dealer + 1) % 4,
    phase: 'result',
    roundResult: { teamPts, bidTeam, otherTeam, bidderMet },
  };
}

// ── AI helpers ────────────────────────────────────────────────────────────────

export function aiChooseBid(state, playerIdx) {
  const hand = state.hands[playerIdx];
  const pts = hand.reduce((s, c) => s + RANK_POINTS[c.rank], 0);
  const suitCounts = {};
  for (const c of hand) suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  const maxSuit = Math.max(...Object.values(suitCounts));
  const handStr = pts * 2 + maxSuit;
  const minBid = state.highestBid + 1;

  // Forced bid if 2 consecutive passes and nobody bid yet
  if (state.consecutivePasses >= 2 && state.bidder === -1) {
    return Math.max(16, minBid);
  }
  if (handStr >= 14 && minBid <= 21) return Math.min(minBid, 21);
  if (handStr >= 10 && minBid <= 18) return Math.min(minBid, 18);
  if (pts >= 5 && minBid <= 17) return minBid;
  return 0; // pass
}

export function aiChooseTrump(state, playerIdx) {
  const hand = state.firstHands[playerIdx]; // decide before second batch
  const pts = {}, counts = {};
  for (const s of SUITS) { pts[s] = 0; counts[s] = 0; }
  for (const c of hand) { pts[c.suit] += RANK_POINTS[c.rank]; counts[c.suit]++; }
  return SUITS.slice().sort((a, b) => (pts[b] + counts[b]) - (pts[a] + counts[a]))[0];
}

export function aiChooseCard(state, playerIdx) {
  const hand = state.hands[playerIdx];
  const valid = validCardIndices(hand, state.trickSuit, state.trump, state.trumpRevealed);
  const partnerIdx = (playerIdx + 2) % 4;
  const partnerWinning =
    state.trickSuit &&
    trickWinner(state.played, state.trickLeader, state.trickSuit, state.trump) === partnerIdx;

  if (partnerWinning) {
    // Dump lowest non-point card
    const sorted = [...valid].sort((a, b) => {
      const pa = RANK_POINTS[hand[a].rank], pb = RANK_POINTS[hand[b].rank];
      if (pa !== pb) return pa - pb;
      return RANK_ORDER.indexOf(hand[a].rank) - RANK_ORDER.indexOf(hand[b].rank);
    });
    return sorted[0];
  }

  // Try to win — play highest-strength valid card
  const sorted = [...valid].sort((a, b) => {
    const sa = cardStrength(hand[a], state.trickSuit, state.trump);
    const sb = cardStrength(hand[b], state.trickSuit, state.trump);
    return sb - sa;
  });
  return sorted[0];
}
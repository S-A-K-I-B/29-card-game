function createGameState(roomId) {
  return {
    roomId,
    players: [],
    teams: { A: [], B: [] },
    dealer: null,
    currentBid: null,
    trumpSuit: null,
    trumpRevealed: false,
    tricks: [],
    scores: { A: 0, B: 0 }
  };
}

function handleBid(state, { playerId, bid }) {
  if (!state.currentBid || bid > state.currentBid.value) {
    state.currentBid = { playerId, value: bid };
  }
}

function playCard(state, { playerId, card }) {
  state.tricks.push({ playerId, card });
  // Trick resolution logic here
}

function revealTrump(state, { suit }) {
  state.trumpSuit = suit;
  state.trumpRevealed = true;
}

module.exports = { createGameState, handleBid, playCard, revealTrump };

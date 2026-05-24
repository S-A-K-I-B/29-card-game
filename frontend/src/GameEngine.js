// Basic game setup for 29
export function initializeGame() {
  return {
    players: [
      { id: 1, name: "Player 1", hand: [] },
      { id: 2, name: "Player 2", hand: [] },
      { id: 3, name: "Player 3", hand: [] },
      { id: 4, name: "Player 4", hand: [] }
    ],
    scores: { teamA: 0, teamB: 0 },
    currentTrick: []
  };
}

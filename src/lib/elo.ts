const K = 32;

export function calculateElo(
  winnerRating: number,
  loserRating: number,
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  const newWinnerRating = Math.round(winnerRating + K * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + K * (0 - expectedLoser));

  return { newWinnerRating, newLoserRating };
}

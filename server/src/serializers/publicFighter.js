export function toPublicFighter(fighter) {
  return {
    id: fighter._id.toString(),
    name: fighter.name,
    level: fighter.level,
    xp: fighter.xp,
    elo: fighter.elo,
    baseStats: fighter.baseStats.toObject(),
    wins: fighter.wins,
    losses: fighter.losses,
    draws: fighter.draws
  };
}

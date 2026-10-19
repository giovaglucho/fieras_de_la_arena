export default function serializeBattle(battle, includeEvents = false) {
  const result = {
    id: battle._id.toString(),
    battleType: battle.battleType,
    createdAt: battle.createdAt,
    winnerFighterId: battle.winnerFighterId?.toString() ?? null,
    actionCount: battle.actionCount,
    engineVersion: battle.engineVersion,
    participants: battle.participants.map(({ snapshot, result: participantResult }) => ({
      fighter: {
        id: snapshot.fighterId.toString(),
        name: snapshot.name,
        level: snapshot.level,
        elo: snapshot.elo,
        stats:
          typeof snapshot.stats.toObject === "function"
            ? snapshot.stats.toObject()
            : snapshot.stats
      },
      result: {
        xpGained: participantResult.xpGained,
        eloChange: participantResult.eloChange,
        eloAfter: participantResult.eloAfter
      }
    }))
  };

  if (includeEvents) {
    result.events = battle.events;
  }

  return result;
}

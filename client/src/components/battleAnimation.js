export function getBattleActions(events) {
  if (!Array.isArray(events)) {
    return []
  }

  const damageByAction = new Map(
    events
      .filter((event) =>
        event?.type === 'damage' &&
        Number.isSafeInteger(event.actionNumber) &&
        typeof event.targetFighterId === 'string',
      )
      .map((event) => [
        `${event.actionNumber}:${event.targetFighterId}`,
        Number.isFinite(event.amount) ? event.amount : null,
      ]),
  )

  return events
    .filter((event) =>
      event?.type === 'attack' &&
      Number.isSafeInteger(event.actionNumber) &&
      typeof event.attackerFighterId === 'string' &&
      typeof event.targetFighterId === 'string',
    )
    .map((event) => ({
      actionNumber: event.actionNumber,
      attackerFighterId: event.attackerFighterId,
      targetFighterId: event.targetFighterId,
      damage: damageByAction.get(`${event.actionNumber}:${event.targetFighterId}`) ?? null,
    }))
}

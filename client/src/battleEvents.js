export function formatBattleEvent(event, fighterNames) {
  const fighterName = (fighterId) => fighterNames.get(fighterId) ?? 'luchador desconocido'

  switch (event.type) {
    case 'combat_started':
      return '¡Comienza el combate!'
    case 'attack':
      if (event.outcome === 'critical') {
        return `Acción ${event.actionNumber}: ${fighterName(event.attackerFighterId)} conecta un golpe crítico contra ${fighterName(event.targetFighterId)}; el daño aumenta.`
      }
      if (event.outcome === 'misfire') {
        return `Acción ${event.actionNumber}: ${fighterName(event.attackerFighterId)} sufre una pifia al atacar a ${fighterName(event.targetFighterId)}; no inflige daño.`
      }
      return `Acción ${event.actionNumber}: ${fighterName(event.attackerFighterId)} ataca a ${fighterName(event.targetFighterId)}.`
    case 'damage':
      return event.amount === 0
        ? `${fighterName(event.targetFighterId)} no recibe daño y conserva ${event.remainingHealth} de vida.`
        : `${fighterName(event.targetFighterId)} recibe ${event.amount} de daño y conserva ${event.remainingHealth} de vida.`
    case 'fighter_defeated':
      return `${fighterName(event.fighterId)} queda fuera de combate.`
    case 'combat_finished':
      return event.winnerFighterId
        ? `${fighterName(event.winnerFighterId)} gana el combate.`
        : 'El combate termina en empate.'
    default:
      return `Evento no compatible con esta versión del motor: ${event.type}.`
  }
}

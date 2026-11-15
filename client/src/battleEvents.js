import { describeTechniqueEffect, getTechniqueName } from './techniques.js'

export function formatBattleEvent(event, fighterNames, petNames = new Map()) {
  const fighterName = (fighterId) => fighterNames.get(fighterId) ?? 'luchador desconocido'
  const petName = (petId) => petNames.get(petId) ?? 'la mascota'

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
        ? event.attackerPetId
          ? `${petName(event.attackerPetId)} no inflige daño a ${fighterName(event.targetFighterId)}.`
          : `${fighterName(event.targetFighterId)} no recibe daño y conserva ${event.remainingHealth} de vida.`
        : event.attackerPetId
          ? `${petName(event.attackerPetId)} inflige ${event.amount} de daño a ${fighterName(event.targetFighterId)}, que conserva ${event.remainingHealth} de vida.`
          : `${fighterName(event.targetFighterId)} recibe ${event.amount} de daño y conserva ${event.remainingHealth} de vida.`
    case 'pet_attack':
      return `${petName(event.attackerPetId)} de ${fighterName(event.teamFighterId)} ataca a ${fighterName(event.targetFighterId)}.`
    case 'pet_targeted_attack':
      return event.evaded
        ? `${fighterName(event.attackerFighterId)} ataca a ${petName(event.targetPetId)}, pero la mascota esquiva el golpe.`
        : `${fighterName(event.attackerFighterId)} dirige su ataque contra ${petName(event.targetPetId)}.`
    case 'pet_damage':
      return event.amount === 0
        ? `${petName(event.targetPetId)} no recibe daño.`
        : `${petName(event.targetPetId)} recibe ${event.amount} de daño y conserva ${event.remainingHealth} de vida.`
    case 'pet_defeated':
      return `${petName(event.petId)} de ${fighterName(event.ownerFighterId)} queda fuera de combate.`
    case 'fighter_defeated':
      return `${fighterName(event.fighterId)} queda fuera de combate.`
    case 'technique_activated': {
      const action = Number.isSafeInteger(event.actionNumber)
        ? ` durante la acción ${event.actionNumber}`
        : ''
      const target = event.targetFighterId
        ? ` (objetivo: ${fighterName(event.targetFighterId)})`
        : ''
      return `${getTechniqueName(event.techniqueId)} se activa para ${fighterName(event.fighterId)}${action}${target}. ${describeTechniqueEffect(event.effect)}`
    }
    case 'combat_finished':
      return event.winnerFighterId
        ? `${fighterName(event.winnerFighterId)} gana el combate.`
        : 'El combate termina en empate.'
    default:
      return `Evento no compatible con esta versión del motor: ${event.type}.`
  }
}

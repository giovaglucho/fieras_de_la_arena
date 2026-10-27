export const EQUIPMENT_SLOT_LABELS = {
  weapon: 'Arma',
  armor: 'Armadura',
}

const MODIFIER_LABELS = {
  attack: 'Ataque',
  defense: 'Defensa',
  initiative: 'Iniciativa',
  piercing: 'Penetración de armadura',
  criticalChance: 'Probabilidad crítica',
}

export function formatEquipmentModifier(name, value) {
  const signedValue = value > 0 ? `+${value}` : String(value)

  if (name === 'criticalChance') {
    return `${signedValue} puntos porcentuales de probabilidad crítica`
  }

  return `${signedValue} ${MODIFIER_LABELS[name] ?? name}`
}

export function getBattleEquipmentSummary(fighter) {
  const equipment = fighter?.equipment
  if (!equipment) {
    return 'Equipo no registrado en este combate.'
  }

  const weapon = equipment.weapon?.name ?? 'sin arma'
  const armor = equipment.armor?.name ?? 'sin armadura'
  return `Carga sorteada: ${weapon} · ${armor}.`
}

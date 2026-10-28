export const TECHNIQUE_NAMES = {
  'tech-manto-polvo': 'Manto de Polvo',
  'tech-ojo-caliza': 'Ojo de Caliza',
  'tech-ritmo-marea': 'Ritmo de Marea',
  'tech-pulso-bronce': 'Pulso de Bronce',
  'tech-umbral-arena': 'Umbral de Arena',
  'tech-guardia-anillos': 'Guardia de Anillos',
  'tech-cuna-estuario': 'Cuña de Estuario',
  'tech-paso-yunque': 'Paso de Yunque',
}

export const TECHNIQUE_DESCRIPTIONS = {
  'tech-manto-polvo': 'Reduce en 2 el daño del primer impacto recibido con vida igual o inferior a la mitad.',
  'tech-ojo-caliza': 'Añade 2 de daño al primer ataque propio que impacta y no es crítico.',
  'tech-ritmo-marea': 'Añade 2 de daño al primer impacto propio posterior a una acción del rival.',
  'tech-pulso-bronce': 'Recupera hasta 3 de vida después de un impacto no letal que deje la vida en la mitad o menos.',
  'tech-umbral-arena': 'Añade 3 de daño a un impacto propio iniciado con vida igual o inferior a la mitad.',
  'tech-guardia-anillos': 'Reduce en 2 el daño del primer impacto crítico recibido.',
  'tech-cuna-estuario': 'Añade 3 de daño al impactar a un rival con vida igual o inferior a la mitad.',
  'tech-paso-yunque': 'Reduce en 3 el daño del primer impacto recibido con vida por encima de la mitad.',
}

export function getTechniqueName(techniqueId) {
  return TECHNIQUE_NAMES[techniqueId] ?? 'Técnica no identificada'
}

export function getTechniqueDescription(technique) {
  if (technique.techniqueVersion !== 'technique-v1') {
    return 'Descripción no disponible para esta versión de la técnica.'
  }

  return TECHNIQUE_DESCRIPTIONS[technique.techniqueId] ?? 'Técnica registrada en la colección.'
}

export function describeTechniqueEffect(effect) {
  if (!effect || !Number.isFinite(effect.amount)) {
    return 'Efecto registrado en el snapshot.'
  }

  if (effect.type === 'damage_bonus') {
    return `Añade ${effect.amount} de daño.`
  }
  if (effect.type === 'damage_reduction') {
    return `Reduce ${effect.amount} de daño.`
  }
  if (effect.type === 'heal') {
    return `Recupera ${effect.amount} de vida.`
  }

  return 'Efecto registrado en el snapshot.'
}

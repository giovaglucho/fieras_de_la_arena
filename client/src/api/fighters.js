import { apiErrorMessage } from './errorMessage.js'
import { isFighterAppearance } from '../fighterAppearance.js'

const FIGHTERS_URL = '/api/v1/fighters'
const FIGHTERS_V2_URL = '/api/v2/fighters'
const PROFILES_URL = '/api/v1/profiles'

async function apiRequest(url, options = {}) {
  let response

  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que esté en ejecución e inténtalo de nuevo.')
  }

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    const error = new Error(apiErrorMessage(result))
    error.code = result?.error?.code
    throw error
  }

  return result
}

function fighterRequest(path, options = {}) {
  return apiRequest(`${FIGHTERS_URL}${path}`, options)
}

function managedFighterRequest(path, options = {}) {
  return apiRequest(`${FIGHTERS_V2_URL}${path}`, options)
}

function readFighterProfile(result) {
  const fighter = result?.fighter
  const stats = fighter?.baseStats
  const hasValidStats = stats &&
    ['health', 'attack', 'defense', 'speed'].every((key) => Number.isFinite(stats[key]))

  if (
    !fighter ||
    typeof fighter.id !== 'string' ||
    typeof fighter.username !== 'string' ||
    typeof fighter.name !== 'string' ||
    !Number.isFinite(fighter.level) ||
    !Number.isFinite(fighter.xp) ||
    !Number.isFinite(fighter.elo) ||
    !Number.isFinite(fighter.wins) ||
    !Number.isFinite(fighter.losses) ||
    !Number.isFinite(fighter.draws) ||
    !hasValidStats
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

function isValidEquipmentItem(item, expectedSlot, includeMinimumLevel = true) {
  const expectedModifiers = expectedSlot === 'weapon'
    ? ['attack', 'initiative', 'piercing', 'criticalChance']
    : ['defense', 'initiative']

  return (
    item &&
    typeof item.itemId === 'string' &&
    item.itemId.length > 0 &&
    typeof item.catalogVersion === 'string' &&
    item.catalogVersion.length > 0 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    ['weapon', 'armor'].includes(item.slot) &&
    item.slot === expectedSlot &&
    (!includeMinimumLevel ||
      (Number.isSafeInteger(item.minLevel) && item.minLevel >= 1)) &&
    item.modifiers &&
    typeof item.modifiers === 'object' &&
    !Array.isArray(item.modifiers) &&
    expectedModifiers.every((modifier) =>
      Number.isSafeInteger(item.modifiers[modifier])
    ) &&
    Object.keys(item.modifiers).length === expectedModifiers.length
  )
}

function readEquipmentCollection(fighter) {
  const { equipment, equipmentUnlocks } = fighter

  if (
    !Array.isArray(equipment) ||
    !Array.isArray(equipmentUnlocks) ||
    !equipment.every((item) =>
      isValidEquipmentItem(item, item?.slot)
    ) ||
    new Set(equipment.map(({ itemId }) => itemId)).size !== equipment.length ||
    !equipmentUnlocks.every((unlock) =>
      unlock &&
      Number.isSafeInteger(unlock.level) &&
      unlock.level >= 2 &&
      typeof unlock.catalogVersion === 'string' &&
      unlock.catalogVersion.length > 0 &&
      (unlock.itemId === null
        ? unlock.item === null
        : typeof unlock.itemId === 'string' &&
          isValidEquipmentItem(unlock.item, unlock.item?.slot) &&
          unlock.item.itemId === unlock.itemId &&
          unlock.item.catalogVersion === unlock.catalogVersion)
    ) ||
    new Set(equipmentUnlocks.map(({ level }) => level)).size !== equipmentUnlocks.length ||
    equipmentUnlocks.some((unlock) =>
      unlock.itemId !== null &&
      !equipment.some((item) =>
        item.itemId === unlock.itemId &&
        item.catalogVersion === unlock.catalogVersion
      )
    )
  ) {
    throw new Error('El servidor devolvió una colección de equipo inesperada. Inténtalo de nuevo.')
  }

  return { equipment, equipmentUnlocks }
}

function isValidTechnique(technique) {
  return (
    technique &&
    typeof technique.techniqueId === 'string' &&
    technique.techniqueId.length > 0 &&
    typeof technique.catalogVersion === 'string' &&
    technique.catalogVersion.length > 0 &&
    typeof technique.techniqueVersion === 'string' &&
    technique.techniqueVersion.length > 0 &&
    typeof technique.name === 'string' &&
    technique.name.length > 0 &&
    ['passive', 'active'].includes(technique.category) &&
    Number.isSafeInteger(technique.minLevel) &&
    technique.minLevel >= 1 &&
    technique.effect &&
    ['damage_bonus', 'damage_reduction', 'heal'].includes(technique.effect.type) &&
    Number.isSafeInteger(technique.effect.amount) &&
    technique.effect.amount >= 0
  )
}

function readTechniqueCollection(fighter) {
  const { techniques, techniqueUnlocks } = fighter

  if (
    !Array.isArray(techniques) ||
    !Array.isArray(techniqueUnlocks) ||
    !techniques.every(isValidTechnique) ||
    new Set(techniques.map(({ techniqueId }) => techniqueId)).size !== techniques.length ||
    !techniqueUnlocks.every((unlock) =>
      unlock &&
      Number.isSafeInteger(unlock.level) &&
      unlock.level >= 2 &&
      typeof unlock.catalogVersion === 'string' &&
      unlock.catalogVersion.length > 0 &&
      (unlock.techniqueId === null
        ? unlock.technique === null
        : typeof unlock.techniqueId === 'string' &&
          isValidTechnique(unlock.technique) &&
          unlock.technique.techniqueId === unlock.techniqueId &&
          unlock.technique.catalogVersion === unlock.catalogVersion)
    ) ||
    new Set(techniqueUnlocks.map(({ level }) => level)).size !== techniqueUnlocks.length ||
    techniqueUnlocks.some((unlock) =>
      unlock.techniqueId !== null &&
      !techniques.some(({ techniqueId, catalogVersion, techniqueVersion }) =>
        techniqueId === unlock.techniqueId &&
        catalogVersion === unlock.catalogVersion &&
        techniqueVersion === unlock.technique.techniqueVersion
      )
    )
  ) {
    throw new Error('El servidor devolvió una colección de técnicas inesperada. Inténtalo de nuevo.')
  }

  return { techniques, techniqueUnlocks }
}

function isValidPet(pet) {
  return (
    pet &&
    typeof pet.petId === 'string' &&
    /^[a-f\d]{24}$/i.test(pet.petId) &&
    ['perro', 'lobo', 'oso'].includes(pet.speciesId) &&
    typeof pet.catalogVersion === 'string' &&
    pet.catalogVersion.length > 0 &&
    typeof pet.version === 'string' &&
    pet.version.length > 0 &&
    typeof pet.name === 'string' &&
    pet.name.length > 0 &&
    ['comun', 'rara', 'muy_rara'].includes(pet.rarity) &&
    pet.stats &&
    ['health', 'strength', 'agility', 'speed'].every((key) =>
      Number.isSafeInteger(pet.stats[key]) && pet.stats[key] >= 0
    ) &&
    pet.effects &&
    Number.isSafeInteger(pet.effects.attacksPerAction?.min) &&
    pet.effects.attacksPerAction.min >= 1 &&
    Number.isSafeInteger(pet.effects.attacksPerAction?.max) &&
    pet.effects.attacksPerAction.max >= pet.effects.attacksPerAction.min &&
    Number.isSafeInteger(pet.effects.evasionChancePercent) &&
    pet.effects.evasionChancePercent >= 0 &&
    pet.effects.evasionChancePercent <= 100 &&
    Number.isSafeInteger(pet.effects.ownerHealthPenalty) &&
    pet.effects.ownerHealthPenalty >= 0
  )
}

function readPetCollection(fighter) {
  const { pets, petUnlocks } = fighter
  const petIds = new Set()

  if (
    !Array.isArray(pets) ||
    !Array.isArray(petUnlocks) ||
    !pets.every((pet) => {
      if (!isValidPet(pet) || petIds.has(pet.petId)) {
        return false
      }
      petIds.add(pet.petId)
      return true
    }) ||
    !petUnlocks.every((unlock) => {
      if (
        !unlock ||
        !Number.isSafeInteger(unlock.level) ||
        unlock.level < 1 ||
        (unlock.petId !== null && typeof unlock.petId !== 'string') ||
        (unlock.speciesId !== null &&
          !['perro', 'lobo', 'oso'].includes(unlock.speciesId))
      ) {
        return false
      }
      if (unlock.petId === null) {
        return unlock.speciesId === null && unlock.pet === null
      }
      return (
        isValidPet(unlock.pet) &&
        unlock.pet.petId === unlock.petId &&
        unlock.pet.speciesId === unlock.speciesId &&
        petIds.has(unlock.petId)
      )
    }) ||
    new Set(petUnlocks.map(({ level }) => level)).size !== petUnlocks.length
  ) {
    throw new Error('El servidor devolvió una colección de mascotas inesperada. Inténtalo de nuevo.')
  }

  return { pets, petUnlocks }
}

function readManagedFighter(fighter, { includeCollection = false } = {}) {
  const stats = fighter?.baseStats
  const hasValidStats = stats &&
    ['health', 'attack', 'defense', 'speed'].every((key) => Number.isFinite(stats[key]))
  const effectiveStats = fighter?.stats
  const hasValidEffectiveStats = effectiveStats &&
    ['health', 'attack', 'defense', 'speed'].every((key) =>
      Number.isFinite(effectiveStats[key])
    )

  if (
    !fighter ||
    typeof fighter.id !== 'string' ||
    typeof fighter.name !== 'string' ||
    !Number.isSafeInteger(fighter.level) ||
    !Number.isSafeInteger(fighter.xp) ||
    !Number.isFinite(fighter.elo) ||
    !Number.isSafeInteger(fighter.wins) ||
    !Number.isSafeInteger(fighter.losses) ||
    !Number.isSafeInteger(fighter.draws) ||
    !['active', 'suspended'].includes(fighter.status) ||
    !['public', 'private'].includes(fighter.visibility) ||
    typeof fighter.isActive !== 'boolean' ||
    typeof fighter.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(fighter.createdAt)) ||
    !hasValidStats ||
    (includeCollection &&
      (!hasValidEffectiveStats ||
        !Number.isSafeInteger(fighter.xpToNextLevel) ||
        fighter.xpToNextLevel < 1))
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return includeCollection
    ? {
        ...fighter,
        ...readEquipmentCollection(fighter),
        ...readTechniqueCollection(fighter),
        ...readPetCollection(fighter),
      }
    : fighter
}

function readFighterCollection(result) {
  const { fighters, pagination } = result ?? {}
  const { page, limit, totalItems, totalPages } = pagination ?? {}

  if (
    !Array.isArray(fighters) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(totalItems) ||
    totalItems < 0 ||
    !Number.isSafeInteger(totalPages) ||
    totalPages !== Math.ceil(totalItems / limit) ||
    fighters.length > limit
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return {
    fighters: fighters.map(readManagedFighter),
    pagination: { page, limit, totalItems, totalPages },
  }
}

export async function fetchMyFighter() {
  const result = await fighterRequest('/me')

  if (result?.fighter === null) {
    return null
  }

  const fighter = readFighterProfile(result)
  const stats = fighter.stats
  const hasValidStats = stats &&
    ['health', 'attack', 'defense', 'speed'].every((key) => Number.isFinite(stats[key]))

  if (!hasValidStats || !Number.isSafeInteger(fighter.xpToNextLevel) || fighter.xpToNextLevel < 1) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

export async function fetchOwnedFighters(page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  return readFighterCollection(
    await managedFighterRequest(`/?${query}`),
  )
}

export async function fetchActiveFighter() {
  const result = await managedFighterRequest('/active')

  if (result?.fighter === null) {
    return null
  }

  return readManagedFighter(result?.fighter, { includeCollection: true })
}

export async function selectActiveFighter(fighterId) {
  const result = await managedFighterRequest('/active', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighterId }),
  })

  return readManagedFighter(result?.fighter, { includeCollection: true })
}

export async function fetchPublicProfile(username) {
  const result = await apiRequest(`${PROFILES_URL}/${encodeURIComponent(username)}`)

  return readFighterProfile(result)
}

export async function createFighter(name, { requestId, appearance }) {
  if (!isFighterAppearance(appearance)) {
    throw new Error('La apariencia seleccionada no es válida. Revisa tus opciones e inténtalo de nuevo.')
  }

  const fighter = readManagedFighter((await managedFighterRequest('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, requestId, appearance }),
  })).fighter)

  if (
    fighter.name.toLowerCase() !== name.normalize('NFC').trim().replace(/ {2,}/g, ' ').toLowerCase() ||
    !isFighterAppearance(fighter.appearance) ||
    Object.keys(appearance).some((field) => fighter.appearance[field] !== appearance[field])
  ) {
    throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.')
  }

  return fighter
}

/**
 * @typedef {Object} FighterCombatStats
 * @property {number} health
 * @property {number} attack
 * @property {number} defense
 * @property {number} speed
 */

/**
 * Equipment properties copied into a single combat snapshot.
 *
 * @typedef {Object} EquipmentSnapshot
 * @property {string} itemId
 * @property {string} catalogVersion
 * @property {string} name
 * @property {"weapon" | "armor"} slot
 * @property {Object<string, number>} modifiers
 */

/**
 * Equipment selected for one fighter for one battle.
 *
 * @typedef {Object} EquipmentLoadout
 * @property {string} version
 * @property {string} catalogVersion
 * @property {EquipmentSnapshot | null} weapon
 * @property {EquipmentSnapshot | null} armor
 */

/**
 * Immutable fighter data used by a single combat.
 *
 * @typedef {Object} FighterSnapshot
 * @property {string} fighterId
 * @property {string} name
 * @property {number} level
 * @property {number} elo
 * @property {FighterCombatStats} stats
 * @property {EquipmentLoadout} [equipment]
 * @property {number} [initiative]
 */

/**
 * @typedef {Object} CombatInput
 * @property {[FighterSnapshot, FighterSnapshot]} fighters
 * @property {string} seed
 */

/**
 * @typedef {Object} CombatStartedEvent
 * @property {"combat_started"} type
 * @property {[string, string]} fighterIds
 */

/**
 * @typedef {Object} AttackEvent
 * @property {"attack"} type
 * @property {number} actionNumber
 * @property {string} attackerFighterId
 * @property {string} targetFighterId
 * @property {"misfire" | "normal" | "critical"} [outcome]
 */

/**
 * @typedef {Object} DamageEvent
 * @property {"damage"} type
 * @property {number} actionNumber
 * @property {string} targetFighterId
 * @property {number} amount
 * @property {number} remainingHealth
 */

/**
 * @typedef {Object} FighterDefeatedEvent
 * @property {"fighter_defeated"} type
 * @property {string} fighterId
 */

/**
 * @typedef {Object} CombatFinishedEvent
 * @property {"combat_finished"} type
 * @property {string | null} winnerFighterId
 */

/**
 * Events are emitted in combat order, including the final summary event.
 *
 * @typedef {CombatStartedEvent | AttackEvent | DamageEvent | FighterDefeatedEvent | CombatFinishedEvent} CombatEvent
 */

/**
 * @typedef {Object} CombatSummary
 * @property {string | null} winnerFighterId Null when the combat is a draw.
 * @property {number} actionCount
 */

/**
 * Domain result, independent of transport and persistence.
 *
 * @typedef {Object} CombatResult
 * @property {CombatSummary} summary
 * @property {CombatEvent[]} events
 * @property {string} engineVersion
 */

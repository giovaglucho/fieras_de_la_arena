import {
  EQUIPMENT_CATALOG_VERSION,
  EQUIPMENT_LOADOUT_VERSION
} from "./equipmentCatalog.js";
import {
  getTechniqueById,
  TECHNIQUE_CATALOG_VERSION,
  TECHNIQUE_LOADOUT_VERSION
} from "./techniqueCatalog.js";

const ENGINE_VERSION = "1.0.0";
const EQUIPMENT_ENGINE_VERSION = "1.1.0";
const TECHNIQUE_ENGINE_VERSION = "1.2.0";
const MAX_ACTIONS = 30;
const MIN_DAMAGE_PERCENT = 90;
const MAX_DAMAGE_PERCENT = 110;
const UINT32_RANGE = 0x100000000;
const MISFIRE_CHANCE = 0.05;
const BASE_CRITICAL_CHANCE = 0.05;
const MAX_CRITICAL_CHANCE = 0.15;

function validateEquipmentItem(item, expectedSlot) {
  if (item === null) {
    return;
  }
  const expectedModifiers =
    expectedSlot === "weapon"
      ? ["attack", "initiative", "piercing", "criticalChance"]
      : ["defense", "initiative"];
  if (
    !item ||
    typeof item !== "object" ||
    item.slot !== expectedSlot ||
    typeof item.itemId !== "string" ||
    item.itemId.length === 0 ||
    typeof item.catalogVersion !== "string" ||
    item.catalogVersion !== EQUIPMENT_CATALOG_VERSION ||
    typeof item.name !== "string" ||
    !item.modifiers ||
    typeof item.modifiers !== "object" ||
    Array.isArray(item.modifiers) ||
    Object.keys(item.modifiers).length !== expectedModifiers.length ||
    expectedModifiers.some(
      (modifier) => !Number.isInteger(item.modifiers[modifier])
    )
  ) {
    throw new TypeError(`The ${expectedSlot} equipment snapshot is invalid.`);
  }
}

function validateTechnique(technique, category, fighterLevel, catalogVersion) {
  if (technique === null) {
    return;
  }
  if (
    !technique ||
    typeof technique !== "object" ||
    Array.isArray(technique) ||
    Object.keys(technique).length !== 5 ||
    typeof technique.techniqueId !== "string" ||
    typeof technique.techniqueVersion !== "string" ||
    technique.category !== category ||
    !Number.isInteger(technique.minLevel) ||
    !technique.effect ||
    typeof technique.effect !== "object" ||
    Array.isArray(technique.effect) ||
    Object.keys(technique.effect).length !== 2 ||
    typeof technique.effect.type !== "string" ||
    !Number.isInteger(technique.effect.amount)
  ) {
    throw new TypeError("The technique snapshot is invalid.");
  }

  const definition = getTechniqueById(
    technique.techniqueId,
    catalogVersion,
    technique.techniqueVersion
  );
  if (
    definition.category !== category ||
    definition.minLevel !== technique.minLevel ||
    definition.minLevel > fighterLevel ||
    definition.effectType !== technique.effect.type ||
    definition.effectAmount !== technique.effect.amount
  ) {
    throw new RangeError("The technique snapshot does not match its catalog.");
  }
}

function validateCombatInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object.");
  }

  if (typeof input.seed !== "string" || input.seed.length === 0) {
    throw new TypeError("seed must be a non-empty string.");
  }

  if (!Array.isArray(input.fighters) || input.fighters.length !== 2) {
    throw new TypeError("fighters must contain exactly two fighters.");
  }

  const fighterIds = new Set();

  const hasEquipmentSnapshot = Object.hasOwn(input.fighters[0] ?? {}, "equipment");
  const hasTechniqueSnapshot = Object.hasOwn(
    input.fighters[0] ?? {},
    "techniques"
  );
  for (const fighter of input.fighters) {
    if (!fighter || typeof fighter !== "object" || Array.isArray(fighter)) {
      throw new TypeError("each fighter must be an object.");
    }

    if (typeof fighter.fighterId !== "string" || fighter.fighterId.length === 0) {
      throw new TypeError("fighterId must be a non-empty string.");
    }

    if (fighterIds.has(fighter.fighterId)) {
      throw new RangeError("fighterIds must be unique.");
    }
    fighterIds.add(fighter.fighterId);

    if (
      typeof fighter.name !== "string" ||
      !Number.isInteger(fighter.level) ||
      fighter.level < 1 ||
      !Number.isFinite(fighter.elo)
    ) {
      throw new TypeError("fighter snapshot fields are invalid.");
    }

    if (!fighter.stats || typeof fighter.stats !== "object" || Array.isArray(fighter.stats)) {
      throw new TypeError("fighter stats must be an object.");
    }

    const { health, attack, defense, speed } = fighter.stats;
    if (
      !Number.isFinite(health) ||
      health <= 0 ||
      !Number.isFinite(attack) ||
      attack < 0 ||
      !Number.isFinite(defense) ||
      defense < 0 ||
      !Number.isFinite(speed) ||
      speed < 0
    ) {
      throw new RangeError("fighter stats must contain valid non-negative values and positive health.");
    }

    if (Object.hasOwn(fighter, "equipment") !== hasEquipmentSnapshot) {
      throw new TypeError("Both fighters must use the same equipment snapshot format.");
    }
    if (Object.hasOwn(fighter, "techniques") !== hasTechniqueSnapshot) {
      throw new TypeError("Both fighters must use the same technique snapshot format.");
    }
    if (hasEquipmentSnapshot) {
      const equipment = fighter.equipment;
      if (
        !equipment ||
        typeof equipment !== "object" ||
        !["weapon", "armor"].every((slot) => Object.hasOwn(equipment, slot)) ||
        Object.keys(equipment).length !== 4 ||
        equipment.version !== EQUIPMENT_LOADOUT_VERSION ||
        equipment.catalogVersion !== EQUIPMENT_CATALOG_VERSION
      ) {
        throw new TypeError("fighter equipment must define weapon and armor slots.");
      }
      validateEquipmentItem(equipment.weapon, "weapon");
      validateEquipmentItem(equipment.armor, "armor");
    }
    if (hasTechniqueSnapshot) {
      const techniques = fighter.techniques;
      if (
        !techniques ||
        typeof techniques !== "object" ||
        Array.isArray(techniques) ||
        Object.keys(techniques).length !== 4 ||
        techniques.version !== TECHNIQUE_LOADOUT_VERSION ||
        techniques.catalogVersion !== TECHNIQUE_CATALOG_VERSION ||
        !Object.hasOwn(techniques, "passive") ||
        !Object.hasOwn(techniques, "active")
      ) {
        throw new TypeError("fighter techniques must define passive and active slots.");
      }
      validateTechnique(
        techniques.passive,
        "passive",
        fighter.level,
        techniques.catalogVersion
      );
      validateTechnique(
        techniques.active,
        "active",
        fighter.level,
        techniques.catalogVersion
      );
    }
  }
}

function createSeededRandom(seed) {
  let state = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }

  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / UINT32_RANGE;
  };
}

function getFirstFighterIndex(fighters, random) {
  if (fighters[0].stats.speed === fighters[1].stats.speed) {
    return random() < 0.5 ? 0 : 1;
  }

  return fighters[0].stats.speed > fighters[1].stats.speed ? 0 : 1;
}

function calculateDamage(attack, defense, random) {
  const damagePercent =
    MIN_DAMAGE_PERCENT +
    Math.floor(random() * (MAX_DAMAGE_PERCENT - MIN_DAMAGE_PERCENT + 1));
  const scaledAttack = Math.floor((attack * damagePercent) / 100);
  return Math.max(1, scaledAttack - defense);
}

function simulateLegacyCombat(fighters, seed) {
  const random = createSeededRandom(seed);
  const remainingHealth = fighters.map((fighter) => fighter.stats.health);
  const events = [
    {
      type: "combat_started",
      fighterIds: fighters.map((fighter) => fighter.fighterId)
    }
  ];

  const firstFighterIndex = getFirstFighterIndex(fighters, random);
  let winnerFighterId = null;
  let actionCount = 0;

  for (let action = 0; action < MAX_ACTIONS; action += 1) {
    const attackerIndex = action % 2 === 0 ? firstFighterIndex : 1 - firstFighterIndex;
    const targetIndex = 1 - attackerIndex;
    const attacker = fighters[attackerIndex];
    const target = fighters[targetIndex];
    const actionNumber = action + 1;
    const damage = Math.min(
      remainingHealth[targetIndex],
      calculateDamage(attacker.stats.attack, target.stats.defense, random)
    );

    events.push(
      {
        type: "attack",
        actionNumber,
        attackerFighterId: attacker.fighterId,
        targetFighterId: target.fighterId
      },
      {
        type: "damage",
        actionNumber,
        targetFighterId: target.fighterId,
        amount: damage,
        remainingHealth: remainingHealth[targetIndex] - damage
      }
    );

    remainingHealth[targetIndex] -= damage;
    actionCount = actionNumber;

    if (remainingHealth[targetIndex] === 0) {
      events.push({
        type: "fighter_defeated",
        fighterId: target.fighterId
      });
      winnerFighterId = attacker.fighterId;
      break;
    }
  }

  if (winnerFighterId === null && remainingHealth[0] !== remainingHealth[1]) {
    winnerFighterId =
      remainingHealth[0] > remainingHealth[1] ? fighters[0].fighterId : fighters[1].fighterId;
  }

  events.push({
    type: "combat_finished",
    winnerFighterId
  });

  return {
    summary: {
      winnerFighterId,
      actionCount
    },
    events,
    engineVersion: ENGINE_VERSION
  };
}

function calculateEquippedDamage(attacker, target, random, critical) {
  const weapon = attacker.equipment.weapon;
  const armor = target.equipment.armor;
  const attack = attacker.stats.attack + (weapon?.modifiers.attack ?? 0);
  const piercing = weapon?.modifiers.piercing ?? 0;
  const armorDefense = Math.max(
    0,
    (armor?.modifiers.defense ?? 0) - piercing
  );
  const defense = target.stats.defense + armorDefense;
  const damagePercent =
    MIN_DAMAGE_PERCENT +
    Math.floor(random() * (MAX_DAMAGE_PERCENT - MIN_DAMAGE_PERCENT + 1));
  const scaledAttack = Math.floor((attack * damagePercent) / 100);
  const normalDamage = Math.max(1, scaledAttack - defense);
  return critical ? Math.max(1, Math.floor(normalDamage * 1.5)) : normalDamage;
}

function simulateEquippedCombat(fighters, seed, hasTechniqueSnapshot = false) {
  const random = createSeededRandom(seed);
  const remainingHealth = fighters.map((fighter) => fighter.stats.health);
  const maximumHealth = fighters.map((fighter) => fighter.stats.health);
  const completedActions = [0, 0];
  const techniqueState = fighters.map((fighter) => ({
    firstOwnImpactSeen: false,
    firstReceivedImpactSeen: false,
    activated: new Set(),
    selected: fighter.techniques ?? null
  }));
  const events = [
    {
      type: "combat_started",
      fighterIds: fighters.map((fighter) => fighter.fighterId)
    }
  ];
  const effectiveSpeeds = fighters.map((fighter) =>
    Math.max(
      1,
      fighter.stats.speed +
        (fighter.equipment.weapon?.modifiers.initiative ?? 0) +
        (fighter.equipment.armor?.modifiers.initiative ?? 0)
    )
  );
  const firstFighterIndex =
    effectiveSpeeds[0] === effectiveSpeeds[1]
      ? random() < 0.5
        ? 0
        : 1
      : effectiveSpeeds[0] > effectiveSpeeds[1]
        ? 0
        : 1;
  let winnerFighterId = null;
  let actionCount = 0;

  for (let action = 0; action < MAX_ACTIONS; action += 1) {
    const attackerIndex = action % 2 === 0 ? firstFighterIndex : 1 - firstFighterIndex;
    const targetIndex = 1 - attackerIndex;
    const attacker = fighters[attackerIndex];
    const target = fighters[targetIndex];
    const actionNumber = action + 1;
    const hitRoll = random();
    const criticalChance = Math.min(
      MAX_CRITICAL_CHANCE,
      Math.max(
        0,
        BASE_CRITICAL_CHANCE +
          (attacker.equipment.weapon?.modifiers.criticalChance ?? 0) / 100
      )
    );
    const outcome =
      hitRoll < MISFIRE_CHANCE
        ? "misfire"
        : hitRoll < MISFIRE_CHANCE + criticalChance
          ? "critical"
          : "normal";
    const impact = outcome !== "misfire";
    let damageBonus = 0;
    let damageReduction = 0;
    const activations = [];
    const attackerTechniques = techniqueState[attackerIndex];
    const targetTechniques = techniqueState[targetIndex];
    const selectedAttackerTechniques = attackerTechniques.selected;
    const selectedTargetTechniques = targetTechniques.selected;

    events.push({
      type: "attack",
      actionNumber,
      attackerFighterId: attacker.fighterId,
      targetFighterId: target.fighterId,
      outcome
    });

    if (hasTechniqueSnapshot && impact) {
      const firstOwnImpact = !attackerTechniques.firstOwnImpactSeen;
      const firstReceivedImpact = !targetTechniques.firstReceivedImpactSeen;
      const addActivation = (ownerIndex, technique, trigger, targetFighterId) => {
        if (!technique) {
          return;
        }
        const ownerState = techniqueState[ownerIndex];
        if (ownerState.activated.has(technique.techniqueId)) {
          return;
        }
        ownerState.activated.add(technique.techniqueId);
        activations.push({
          technique,
          ownerIndex,
          trigger,
          targetFighterId
        });
      };
      const ownHealthAtHalf =
        remainingHealth[attackerIndex] * 2 <= maximumHealth[attackerIndex];
      const rivalHealthAtHalf =
        remainingHealth[targetIndex] * 2 <= maximumHealth[targetIndex];

      if (
        selectedAttackerTechniques?.passive?.techniqueId === "tech-ojo-caliza" &&
        firstOwnImpact &&
        outcome !== "critical"
      ) {
        addActivation(
          attackerIndex,
          selectedAttackerTechniques.passive,
          "first_noncritical_impact",
          target.fighterId
        );
      } else if (
        selectedAttackerTechniques?.passive?.techniqueId ===
          "tech-umbral-arena" &&
        ownHealthAtHalf
      ) {
        addActivation(
          attackerIndex,
          selectedAttackerTechniques.passive,
          "own_health_at_or_below_half",
          target.fighterId
        );
      }

      if (
        selectedAttackerTechniques?.active?.techniqueId === "tech-ritmo-marea" &&
        firstOwnImpact &&
        completedActions[targetIndex] > 0
      ) {
        addActivation(
          attackerIndex,
          selectedAttackerTechniques.active,
          "first_impact_after_rival_action",
          target.fighterId
        );
      } else if (
        selectedAttackerTechniques?.active?.techniqueId ===
          "tech-cuna-estuario" &&
        rivalHealthAtHalf
      ) {
        addActivation(
          attackerIndex,
          selectedAttackerTechniques.active,
          "rival_health_at_or_below_half",
          target.fighterId
        );
      }

      if (
        selectedTargetTechniques?.passive?.techniqueId === "tech-manto-polvo" &&
        remainingHealth[targetIndex] * 2 <= maximumHealth[targetIndex]
      ) {
        addActivation(
          targetIndex,
          selectedTargetTechniques.passive,
          "received_impact_at_or_below_half",
          target.fighterId
        );
      } else if (
        selectedTargetTechniques?.passive?.techniqueId ===
          "tech-guardia-anillos" &&
        outcome === "critical"
      ) {
        addActivation(
          targetIndex,
          selectedTargetTechniques.passive,
          "first_received_critical_impact",
          attacker.fighterId
        );
      }

      if (
        selectedTargetTechniques?.active?.techniqueId === "tech-paso-yunque" &&
        firstReceivedImpact &&
        remainingHealth[targetIndex] * 2 > maximumHealth[targetIndex]
      ) {
        addActivation(
          targetIndex,
          selectedTargetTechniques.active,
          "first_received_impact_above_half",
          attacker.fighterId
        );
      }

      attackerTechniques.firstOwnImpactSeen = true;
      targetTechniques.firstReceivedImpactSeen = true;

      for (const activation of activations) {
        if (activation.technique.effect.type === "damage_bonus") {
          damageBonus += activation.technique.effect.amount;
        } else if (activation.technique.effect.type === "damage_reduction") {
          damageReduction += activation.technique.effect.amount;
        }
        events.push({
          type: "technique_activated",
          actionNumber,
          techniqueId: activation.technique.techniqueId,
          techniqueVersion: activation.technique.techniqueVersion,
          fighterId: fighters[activation.ownerIndex].fighterId,
          trigger: activation.trigger,
          targetFighterId: activation.targetFighterId,
          effect: {
            type: activation.technique.effect.type,
            amount: activation.technique.effect.amount
          }
        });
      }
    }

    const baseDamage = impact
      ? calculateEquippedDamage(
          attacker,
          target,
          random,
          outcome === "critical"
        )
      : 0;
    const damage = Math.min(
      remainingHealth[targetIndex],
      Math.max(0, baseDamage + damageBonus - damageReduction)
    );
    remainingHealth[targetIndex] -= damage;

    events.push({
      type: "damage",
      actionNumber,
      targetFighterId: target.fighterId,
      amount: damage,
      remainingHealth: remainingHealth[targetIndex]
    });

    if (
      hasTechniqueSnapshot &&
      damage > 0 &&
      remainingHealth[targetIndex] > 0 &&
      remainingHealth[targetIndex] * 2 <= maximumHealth[targetIndex] &&
      selectedTargetTechniques?.active?.techniqueId === "tech-pulso-bronce" &&
      !targetTechniques.activated.has("tech-pulso-bronce")
    ) {
      const healthBefore = remainingHealth[targetIndex];
      const healTechnique = selectedTargetTechniques.active;
      targetTechniques.activated.add(healTechnique.techniqueId);
      remainingHealth[targetIndex] = Math.min(
        maximumHealth[targetIndex],
        healthBefore + healTechnique.effect.amount
      );
      events.push({
        type: "technique_activated",
        actionNumber,
        techniqueId: healTechnique.techniqueId,
        techniqueVersion: healTechnique.techniqueVersion,
        fighterId: target.fighterId,
        trigger: "nonlethal_damage_left_health_at_or_below_half",
        targetFighterId: target.fighterId,
        effect: {
          type: healTechnique.effect.type,
          amount: remainingHealth[targetIndex] - healthBefore
        },
        healthBefore,
        healthAfter: remainingHealth[targetIndex]
      });
    }

    completedActions[attackerIndex] += 1;

    actionCount = actionNumber;

    if (remainingHealth[targetIndex] === 0) {
      events.push({
        type: "fighter_defeated",
        fighterId: target.fighterId
      });
      winnerFighterId = attacker.fighterId;
      break;
    }
  }

  if (winnerFighterId === null && remainingHealth[0] !== remainingHealth[1]) {
    winnerFighterId =
      remainingHealth[0] > remainingHealth[1]
        ? fighters[0].fighterId
        : fighters[1].fighterId;
  }

  events.push({
    type: "combat_finished",
    winnerFighterId
  });

  return {
    summary: {
      winnerFighterId,
      actionCount
    },
    events,
    engineVersion: hasTechniqueSnapshot
      ? TECHNIQUE_ENGINE_VERSION
      : EQUIPMENT_ENGINE_VERSION
  };
}

export function simulateCombat(input) {
  validateCombatInput(input);

  const { fighters, seed } = input;
  if (Object.hasOwn(fighters[0], "equipment")) {
    return simulateEquippedCombat(
      fighters,
      seed,
      Object.hasOwn(fighters[0], "techniques")
    );
  }
  return simulateLegacyCombat(fighters, seed);
}

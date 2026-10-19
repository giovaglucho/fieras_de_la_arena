const ENGINE_VERSION = "1.0.0";
const MAX_ACTIONS = 30;
const MIN_DAMAGE_PERCENT = 90;
const MAX_DAMAGE_PERCENT = 110;
const UINT32_RANGE = 0x100000000;

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

export function simulateCombat(input) {
  validateCombatInput(input);

  const { fighters, seed } = input;
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

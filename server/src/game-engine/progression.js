const XP_REWARDS = {
  win: 25,
  loss: 10,
  draw: 15
};
const TRAINING_XP_REWARD = 5;
const INITIAL_XP_TO_NEXT_LEVEL = 100;
const XP_TO_NEXT_LEVEL_INCREMENT = 25;
const ELO_K_FACTOR = 32;

function validateOutcome(outcome) {
  if (!Object.hasOwn(XP_REWARDS, outcome)) {
    throw new RangeError("outcome must be win, loss, or draw.");
  }
}

function validateIsTraining(isTraining) {
  if (typeof isTraining !== "boolean") {
    throw new TypeError("isTraining must be a boolean.");
  }
}

export function calculateXpReward({ outcome, isTraining = false }) {
  validateOutcome(outcome);
  validateIsTraining(isTraining);

  return isTraining ? TRAINING_XP_REWARD : XP_REWARDS[outcome];
}

export function applyExperience({ level, xp, xpGained }) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("level must be a positive integer.");
  }
  if (!Number.isInteger(xp) || xp < 0) {
    throw new RangeError("xp must be a non-negative integer.");
  }
  if (!Number.isInteger(xpGained) || xpGained < 0) {
    throw new RangeError("xpGained must be a non-negative integer.");
  }

  let nextLevel = level;
  let remainingXp = xp + xpGained;

  while (
    remainingXp >=
    INITIAL_XP_TO_NEXT_LEVEL + XP_TO_NEXT_LEVEL_INCREMENT * (nextLevel - 1)
  ) {
    remainingXp -=
      INITIAL_XP_TO_NEXT_LEVEL + XP_TO_NEXT_LEVEL_INCREMENT * (nextLevel - 1);
    nextLevel += 1;
  }

  return {
    level: nextLevel,
    xp: remainingXp,
    levelsGained: nextLevel - level
  };
}

export function calculateEloChanges({
  firstElo,
  secondElo,
  outcome,
  isTraining = false
}) {
  if (!Number.isFinite(firstElo) || firstElo < 0) {
    throw new RangeError("firstElo must be a non-negative number.");
  }
  if (!Number.isFinite(secondElo) || secondElo < 0) {
    throw new RangeError("secondElo must be a non-negative number.");
  }
  validateOutcome(outcome);
  validateIsTraining(isTraining);

  if (isTraining) {
    return { firstChange: 0, secondChange: 0 };
  }

  const expectedFirstScore =
    1 / (1 + 10 ** ((secondElo - firstElo) / 400));
  const actualFirstScore = { win: 1, loss: 0, draw: 0.5 }[outcome];
  const rawFirstChange = ELO_K_FACTOR * (actualFirstScore - expectedFirstScore);
  const firstChange =
    Math.sign(rawFirstChange) * Math.round(Math.abs(rawFirstChange));

  return {
    firstChange,
    secondChange: firstChange === 0 ? 0 : -firstChange
  };
}

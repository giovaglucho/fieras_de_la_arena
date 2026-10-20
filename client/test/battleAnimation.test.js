import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getBattleActions } from '../src/components/battleAnimation.js'

test('builds visual actions from persisted attack and damage events', () => {
  const actions = getBattleActions([
    { type: 'combat_started', fighterIds: ['fighter-a', 'fighter-b'] },
    {
      type: 'attack',
      actionNumber: 1,
      attackerFighterId: 'fighter-a',
      targetFighterId: 'fighter-b',
    },
    {
      type: 'damage',
      actionNumber: 1,
      targetFighterId: 'fighter-b',
      amount: 7,
      remainingHealth: 93,
    },
    {
      type: 'attack',
      actionNumber: 2,
      attackerFighterId: 'fighter-b',
      targetFighterId: 'fighter-a',
    },
    {
      type: 'damage',
      actionNumber: 2,
      targetFighterId: 'fighter-a',
      amount: 5,
      remainingHealth: 95,
    },
    { type: 'combat_finished', winnerFighterId: 'fighter-a' },
  ])

  assert.deepEqual(actions, [
    {
      actionNumber: 1,
      attackerFighterId: 'fighter-a',
      targetFighterId: 'fighter-b',
      damage: 7,
    },
    {
      actionNumber: 2,
      attackerFighterId: 'fighter-b',
      targetFighterId: 'fighter-a',
      damage: 5,
    },
  ])
})

test('ignores malformed attacks, keeps missing damage optional and handles no event list', () => {
  assert.deepEqual(
    getBattleActions([
      { type: 'attack', actionNumber: 1, attackerFighterId: 'fighter-a' },
      { type: 'attack', attackerFighterId: 'fighter-a', targetFighterId: 'fighter-b' },
      { type: 'attack', actionNumber: 2, attackerFighterId: 'fighter-a', targetFighterId: 'fighter-b' },
    ]),
    [{
      actionNumber: 2,
      attackerFighterId: 'fighter-a',
      targetFighterId: 'fighter-b',
      damage: null,
    }],
  )
  assert.deepEqual(getBattleActions(null), [])
})

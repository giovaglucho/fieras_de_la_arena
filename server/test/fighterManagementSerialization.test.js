import assert from "node:assert/strict";
import { test } from "node:test";
import { serializeManagedFighter } from "../src/services/fighterManagementService.js";

function createFighter() {
  return {
    _id: { toString: () => "fighter-id" },
    name: "colmillo",
    level: 3,
    xp: 20,
    elo: 1016,
    baseStats: { health: 100, attack: 10, defense: 4, speed: 5 },
    appearance: {},
    wins: 1,
    losses: 0,
    draws: 0,
    status: "active",
    visibility: "private",
    createdAt: new Date("2026-10-27T12:00:00.000Z"),
    techniques: [
      {
        techniqueId: "tech-manto-polvo",
        catalogVersion: "fighter-techniques-v1",
        techniqueVersion: "technique-v1"
      },
      {
        techniqueId: "tech-ojo-caliza",
        catalogVersion: "fighter-techniques-v1",
        techniqueVersion: "technique-v1"
      }
    ],
    techniqueUnlocks: [
      {
        level: 2,
        seed: Buffer.alloc(32, 1),
        version: "fighter-technique-unlock-v1",
        techniqueId: "tech-ojo-caliza",
        catalogVersion: "fighter-techniques-v1",
        requestId: "private-reward-key"
      },
      {
        level: 3,
        seed: Buffer.alloc(32, 2),
        version: "fighter-technique-unlock-v1",
        techniqueId: null,
        catalogVersion: "fighter-techniques-v1",
        requestId: "private-miss-key"
      }
    ]
  };
}

test("serializa la colección propia y omite secretos de desbloqueo", () => {
  const fighter = serializeManagedFighter(createFighter(), null, true);

  assert.deepEqual(
    fighter.techniques.map(({ techniqueId, name }) => ({ techniqueId, name })),
    [
      { techniqueId: "tech-manto-polvo", name: "Manto de Polvo" },
      { techniqueId: "tech-ojo-caliza", name: "Ojo de Caliza" }
    ]
  );
  assert.deepEqual(
    fighter.techniqueUnlocks.map(({ level, techniqueId, technique }) => ({
      level,
      techniqueId,
      techniqueName: technique?.name ?? null
    })),
    [
      { level: 2, techniqueId: "tech-ojo-caliza", techniqueName: "Ojo de Caliza" },
      { level: 3, techniqueId: null, techniqueName: null }
    ]
  );
  assert.doesNotMatch(JSON.stringify(fighter), /seed|requestId|private-reward-key/i);
});

test("las respuestas sin permiso de colección no incluyen técnicas", () => {
  const fighter = serializeManagedFighter(createFighter(), null);

  assert.equal(Object.hasOwn(fighter, "techniques"), false);
  assert.equal(Object.hasOwn(fighter, "techniqueUnlocks"), false);
});

test("rechaza un desbloqueo que no coincide con la colección guardada", () => {
  const fighter = createFighter();
  fighter.techniqueUnlocks[0].techniqueId = "tech-ritmo-marea";

  assert.throws(
    () => serializeManagedFighter(fighter, null, true),
    /no coincide con la colección/
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanFighterName, fighterDisplayName, fighterNameKey } from "../src/utils/fighterName.js";
import { validateFighterCreation } from "../src/validators/fighterCreation.js";
import { validateManagedFighterCreation } from "../src/validators/fighterManagement.js";

test("acepta letras con acentos, números y separadores simples y conserva mayúsculas", () => {
  assert.equal(cleanFighterName("León"), "León");
  assert.equal(cleanFighterName("  Fiera   Roja  "), "Fiera Roja");
  assert.equal(cleanFighterName("Bruto_99"), "Bruto_99");
  assert.equal(cleanFighterName("Ana-María"), "Ana-María");
  assert.equal(cleanFighterName("Ñandú"), "Ñandú");
});

test("rechaza HTML, emojis, símbolos, separadores sueltos y longitudes inválidas", () => {
  for (const bad of [
    "<script>x</script>", "🔥🔥🔥Fuego", "ab", "a".repeat(19), "Hola!", "_inicio", "fin-", "a--b", "x@y.com",
    "Nombre\nlinea", "a\u0000bc", "   ", 12345, null, undefined
  ]) {
    assert.equal(cleanFighterName(bad), null, String(bad));
  }
});

test("la clave única es la versión en minúsculas y el nombre para mostrar recae en name si falta", () => {
  assert.equal(fighterNameKey("LeÓn Rojo"), "león rojo");
  assert.equal(fighterDisplayName({ name: "leon", displayName: "León" }), "León");
  assert.equal(fighterDisplayName({ name: "leon" }), "leon");
});

test("los validadores v1 y v2 limpian el nombre y rechazan los no permitidos", () => {
  assert.deepEqual(validateFighterCreation({ name: "  Fiera  Roja " }), { name: "Fiera Roja" });
  assert.equal(validateFighterCreation({ name: "<b>x</b>" }), null);
  assert.equal(validateManagedFighterCreation({ name: "<b>x</b>", requestId: "r1" }), null);
  assert.equal(validateManagedFighterCreation({ name: "🔥🔥🔥", requestId: "r1" }), null);
  assert.equal(validateManagedFighterCreation({ name: "Fiera Roja", requestId: "r1" }).name, "Fiera Roja");
});

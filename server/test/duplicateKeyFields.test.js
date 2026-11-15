import assert from "node:assert/strict";
import { test } from "node:test";
import { getDuplicateKeyFields } from "../src/utils/duplicateKeyFields.js";

test("extrae los campos de errores MongoDB de clave duplicada", () => {
  assert.deepEqual(
    getDuplicateKeyFields({
      code: 11000,
      keyPattern: { userId: 1 }
    }),
    { userId: 1 }
  );
  assert.deepEqual(
    getDuplicateKeyFields({
      code: 11000,
      keyValue: { referralCode: "occupied" }
    }),
    { referralCode: "occupied" }
  );
  assert.equal(getDuplicateKeyFields({ code: 11000 }), null);
  assert.equal(getDuplicateKeyFields({ code: 11001, keyPattern: { userId: 1 } }), null);
});

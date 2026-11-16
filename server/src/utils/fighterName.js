// Nombres de luchador:
//  - Letras (con acentos), números y separadores simples (espacio, guion o guion bajo)
//    entre grupos; 3 a 18 caracteres. Sin HTML, emojis ni símbolos.
//  - `name` (en la base de datos) es la clave normalizada en minúsculas y única.
//  - `displayName` conserva las mayúsculas que eligió la persona.
const NAME_PATTERN = /^[\p{L}\p{M}\p{N}]+(?:[ _-][\p{L}\p{M}\p{N}]+)*$/u;
export const FIGHTER_NAME_MIN = 3;
export const FIGHTER_NAME_MAX = 18;

// Devuelve el nombre limpio para mostrar (espacios colapsados) o null si no es válido.
export function cleanFighterName(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const cleaned = raw.normalize("NFC").trim().replace(/ {2,}/g, " ");
  const length = [...cleaned].length;
  if (length < FIGHTER_NAME_MIN || length > FIGHTER_NAME_MAX || !NAME_PATTERN.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function fighterNameKey(displayName) {
  return displayName.toLowerCase();
}

export function fighterDisplayName(fighter) {
  return fighter?.displayName ?? fighter?.name;
}

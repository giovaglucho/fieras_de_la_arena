// Misma regla que el servidor (server/src/utils/fighterName.js): letras con acentos, números y
// separadores simples (espacio, guion o guion bajo) entre grupos; de 3 a 18 caracteres.
const NAME_PATTERN = /^[\p{L}\p{M}\p{N}]+(?:[ _-][\p{L}\p{M}\p{N}]+)*$/u

export const FIGHTER_NAME_HINT =
  'De 3 a 18 caracteres: letras, números, espacios, guiones o guion bajo. Debe estar disponible.'

export function cleanFighterName(raw) {
  if (typeof raw !== 'string') {
    return null
  }
  const cleaned = raw.normalize('NFC').trim().replace(/ {2,}/g, ' ')
  const length = [...cleaned].length
  return length >= 3 && length <= 18 && NAME_PATTERN.test(cleaned) ? cleaned : null
}

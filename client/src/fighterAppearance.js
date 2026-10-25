export const FIGHTER_APPEARANCE_OPTIONS = Object.freeze({
  tone: Object.freeze([
    { value: 'arena', label: 'Arena' },
    { value: 'arcilla', label: 'Arcilla' },
    { value: 'cobre', label: 'Cobre' },
    { value: 'pizarra', label: 'Pizarra' },
    { value: 'marfil', label: 'Marfil' },
  ]),
  hair: Object.freeze([
    { value: 'rapado', label: 'Rapado' },
    { value: 'corto', label: 'Corto' },
    { value: 'trenzas', label: 'Trenzas' },
    { value: 'melena', label: 'Melena' },
    { value: 'cresta', label: 'Cresta' },
  ]),
  clothing: Object.freeze([
    { value: 'tunica-cruzada', label: 'Túnica cruzada' },
    { value: 'manto-corto', label: 'Manto corto' },
    { value: 'faldon-tejido', label: 'Faldón tejido' },
    { value: 'chaleco-tejido', label: 'Chaleco tejido' },
  ]),
  accessory: Object.freeze([
    { value: 'ninguno', label: 'Ninguno' },
    { value: 'cinta', label: 'Cinta' },
    { value: 'collar-cuentas', label: 'Collar de cuentas' },
    { value: 'brazaletes', label: 'Brazaletes' },
    { value: 'pendientes', label: 'Pendientes' },
  ]),
})

export const FIGHTER_APPEARANCE_FIELD_LABELS = Object.freeze({
  tone: 'Tono',
  hair: 'Cabello',
  clothing: 'Vestimenta',
  accessory: 'Accesorio',
})

export const NEUTRAL_FIGHTER_APPEARANCE = Object.freeze({
  tone: 'arena',
  hair: 'rapado',
  clothing: 'tunica-cruzada',
  accessory: 'ninguno',
})

export function isFighterAppearance(appearance) {
  return Boolean(
    appearance &&
      Object.keys(FIGHTER_APPEARANCE_OPTIONS).every((field) =>
        FIGHTER_APPEARANCE_OPTIONS[field].some(
          (option) => option.value === appearance[field],
        ),
      ) &&
      Object.keys(appearance).length === Object.keys(FIGHTER_APPEARANCE_OPTIONS).length,
  )
}

export function getFighterAppearanceLabel(field, value) {
  return FIGHTER_APPEARANCE_OPTIONS[field]?.find((option) => option.value === value)?.label ?? value
}

import { getFighterAppearanceLabel } from '../fighterAppearance.js'

export default function FighterAppearancePreview({ appearance, name }) {
  const description = [
    `tono ${getFighterAppearanceLabel('tone', appearance.tone)}`,
    `cabello ${getFighterAppearanceLabel('hair', appearance.hair)}`,
    `vestimenta ${getFighterAppearanceLabel('clothing', appearance.clothing)}`,
    `accesorio ${getFighterAppearanceLabel('accessory', appearance.accessory)}`,
  ].join(', ')

  return (
    <div
      className="fighter-portrait"
      data-tone={appearance.tone}
      data-hair={appearance.hair}
      data-clothing={appearance.clothing}
      data-accessory={appearance.accessory}
      role="img"
      aria-label={`${name || 'Vista previa del luchador'}: ${description}`}
    >
      <span className="fighter-portrait__hair" aria-hidden="true" />
      <span className="fighter-portrait__head" aria-hidden="true" />
      <span className="fighter-portrait__body" aria-hidden="true" />
      <span className="fighter-portrait__accessory" aria-hidden="true" />
    </div>
  )
}

import { EQUIPMENT_SLOT_LABELS, formatEquipmentModifier } from '../equipment.js'

export default function EquipmentItemDetails({
  item,
  headingLevel = 3,
  showMinimumLevel = false,
}) {
  const Heading = `h${headingLevel}`
  const modifiers = Object.entries(item.modifiers)
    .filter(([, value]) => value !== 0)

  return (
    <article className="equipment-item">
      <Heading>{item.name}</Heading>
      <p className="equipment-item__slot">{EQUIPMENT_SLOT_LABELS[item.slot]}</p>
      {showMinimumLevel && (
        <p className="equipment-item__level">Disponible desde nivel {item.minLevel}</p>
      )}
      <dl className="equipment-item__modifiers">
        <div>
          <dt>Efectos</dt>
          <dd>
            {modifiers.length > 0
              ? modifiers.map(([name, value]) => formatEquipmentModifier(name, value)).join(' · ')
              : 'Sin modificadores adicionales'}
          </dd>
        </div>
      </dl>
    </article>
  )
}

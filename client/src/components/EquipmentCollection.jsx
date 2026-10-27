import EquipmentItemDetails from './EquipmentItemDetails.jsx'

function EquipmentGroup({ slot, title, equipment }) {
  const items = equipment.filter((item) => item.slot === slot)

  return (
    <section className="equipment-collection__group" aria-labelledby={`equipment-${slot}-title`}>
      <h2 id={`equipment-${slot}-title`}>{title}</h2>
      {items.length === 0 ? (
        <p className="equipment-collection__empty">No tienes {slot === 'weapon' ? 'armas' : 'armaduras'} todavía.</p>
      ) : (
        <ul className="equipment-collection__items">
          {items.map((item) => (
            <li key={`${item.catalogVersion}-${item.itemId}`}>
              <EquipmentItemDetails item={item} showMinimumLevel />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function EquipmentCollection({ fighter }) {
  const itemsById = new Map(
    fighter.equipment.map((item) => [item.itemId, item])
  )

  return (
    <div className="equipment-collection" aria-labelledby="equipment-collection-title">
      <p className="eyebrow">Colección de {fighter.name}</p>
      <h1 id="equipment-collection-title">Colección de equipo</h1>
      <p className="auth-intro">
        Estos objetos pertenecen a este luchador. En cada combate el servidor sortea automáticamente
        una pieza de cada espacio disponible; esta colección no permite elegir ni cambiar la carga.
      </p>

      <div className="equipment-collection__groups">
        <EquipmentGroup slot="weapon" title="Armas" equipment={fighter.equipment} />
        <EquipmentGroup slot="armor" title="Armaduras" equipment={fighter.equipment} />
      </div>

      <section className="equipment-collection__unlocks" aria-labelledby="equipment-unlocks-title">
        <h2 id="equipment-unlocks-title">Desbloqueos por nivel</h2>
        {fighter.equipmentUnlocks.length === 0 ? (
          <p>Aún no hay desbloqueos de equipo registrados.</p>
        ) : (
          <ol>
            {fighter.equipmentUnlocks.map((unlock) => {
              const item = unlock.item ?? itemsById.get(unlock.itemId)

              return (
                <li key={unlock.level}>
                  <strong>Nivel {unlock.level}</strong>
                  {item ? (
                    <span> Desbloqueaste {item.name} ({item.slot === 'weapon' ? 'arma' : 'armadura'}).</span>
                  ) : (
                    <span> Esta tirada no otorgó un objeto.</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {fighter.equipment.length === 0 && (
        <p className="equipment-collection__legacy">
          La colección está vacía. Este luchador puede combatir sin equipo.
        </p>
      )}
    </div>
  )
}

export function EquipmentCollectionPanel({ status, fighter, error, onRetry }) {
  if (status === 'loading') {
    return <p className="equipment-collection__message" role="status">Cargando la colección de equipo…</p>
  }

  if (status === 'error') {
    return (
      <div className="equipment-collection__message">
        <p className="request-error" role="alert">{error}</p>
        <button className="button button--primary" type="button" onClick={onRetry}>
          Intentar de nuevo
        </button>
      </div>
    )
  }

  return <EquipmentCollection fighter={fighter} />
}

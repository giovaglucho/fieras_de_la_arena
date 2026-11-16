import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EquipmentCollectionPanel } from '../components/EquipmentCollection.jsx'
import { fetchActiveFighter } from '../api/fighters.js'
import Brand from '../components/Brand.jsx'
import PetCollection from '../components/PetCollection.jsx'
import TechniqueCollection from '../components/TechniqueCollection.jsx'

function EquipmentCollectionPage() {
  const [fighter, setFighter] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setError('')

    fetchActiveFighter()
      .then((activeFighter) => {
        if (!isCurrent) {
          return
        }
        if (!activeFighter) {
          throw new Error('Selecciona un luchador activo antes de consultar su colección.')
        }

        setFighter(activeFighter)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message)
          setStatus('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [reloadVersion])

  return (
    <main className="session-layout">
      <Brand />
      <section className="session-card equipment-collection-card" aria-label="Colecciones del luchador">
        <nav className="equipment-collection__navigation" aria-label="Navegación de colección">
          <Link className="button button--secondary" to="/dashboard">Volver al panel</Link>
          <Link className="button button--secondary" to="/history">Ver historial de combates</Link>
        </nav>
        <EquipmentCollectionPanel
          status={status}
          fighter={fighter}
          error={error}
          onRetry={() => setReloadVersion((version) => version + 1)}
        />
        {status === 'ready' && (
          <>
            <TechniqueCollection fighter={fighter} />
            <PetCollection fighter={fighter} />
          </>
        )}
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default EquipmentCollectionPage

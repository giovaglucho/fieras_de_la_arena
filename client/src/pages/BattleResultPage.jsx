import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchActiveFighter } from '../api/fighters.js'
import { fetchBattle } from '../api/arena.js'
import { formatBattleEvent } from '../battleEvents.js'
import BattleAnimation from '../components/BattleAnimation.jsx'
import BattleEquipment from '../components/BattleEquipment.jsx'
import BattlePets from '../components/BattlePets.jsx'
import BattleProgression, { BattleResultError } from '../components/BattleProgression.jsx'
import BattleTechniques from '../components/BattleTechniques.jsx'
import Brand from '../components/Brand.jsx'

function BattleResultPage() {
  const { id } = useParams()
  const [battle, setBattle] = useState(null)
  const [ownFighterId, setOwnFighterId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setStatus('loading')
    setError('')

    fetchBattle(id)
      .then(async (loadedBattle) => {
        if (!isCurrent) {
          return
        }

        const activeFighter = loadedBattle.ownFighterId
          ? null
          : await fetchActiveFighter()
        if (!isCurrent) {
          return
        }
        const ownerId = loadedBattle.ownFighterId ?? activeFighter?.id
        if (
          !ownerId ||
          !loadedBattle.participants.some(({ fighter: participant }) => participant.id === ownerId)
        ) {
          throw new Error('El registro del combate no incluye a tu luchador.')
        }

        setBattle(loadedBattle)
        setOwnFighterId(ownerId)
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
  }, [id, reloadVersion])

  const ownParticipant = battle?.participants.find(
    ({ fighter: participant }) => participant.id === ownFighterId,
  )
  const opponentParticipant = battle?.participants.find(
    ({ fighter: participant }) => participant.id !== ownFighterId,
  )
  const isDraw = battle?.winnerFighterId === null
  const isVictory = battle?.winnerFighterId === ownFighterId
  const fighterNames = new Map(
    battle?.participants.map(({ fighter: participant }) => [participant.id, participant.name]) ?? [],
  )
  const petNames = new Map(
    battle?.participants.flatMap(({ fighter: participant }) =>
      (participant.pets ?? []).map(({ petId, name }) => [petId, name]),
    ) ?? [],
  )
  const outcome = isDraw ? 'Empate' : isVictory ? '¡Victoria!' : 'Derrota'
  const outcomeStyle = isDraw ? 'draw' : isVictory ? 'win' : 'loss'

  return (
    <main className="session-layout">
      <Brand />

      {status === 'loading' ? (
        <section className="session-card battle-result-card" role="status">
          Cargando el resultado guardado…
        </section>
      ) : status === 'error' ? (
        <section className="session-card battle-result-card">
          <BattleResultError
            error={error}
            onRetry={() => setReloadVersion((version) => version + 1)}
          />
          <Link className="button button--secondary" to="/arena">Volver a la Arena</Link>
        </section>
      ) : (
        <article className="session-card battle-result-card" aria-labelledby="battle-result-title">
          <Link className="button button--secondary" to="/arena">Volver a la Arena</Link>
          <Link className="button button--secondary" to="/history">Ver historial de combates</Link>
          <Link className="button button--secondary" to="/collection">Ver colecciones del luchador</Link>
          <p className="eyebrow">
            {battle.battleType === 'training' ? 'Combate de entrenamiento' : 'Combate PvP'}
          </p>
          <p className={`battle-result__outcome battle-result__outcome--${outcomeStyle}`}>
            {outcome}
          </p>
          <h1 id="battle-result-title">{opponentParticipant.fighter.name}</h1>
          <p className="auth-intro">
            Rival · Nivel {opponentParticipant.fighter.level} · ELO {opponentParticipant.fighter.elo}
          </p>
          <p className="battle-result__date">
            <time dateTime={battle.createdAt}>
              {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })
                .format(new Date(battle.createdAt))}
            </time>
          </p>

          <dl className="battle-result__metrics">
            <div>
              <dt>Experiencia obtenida</dt>
              <dd>+{ownParticipant.result.xpGained} XP</dd>
            </div>
            <div>
              <dt>Cambio de ELO</dt>
              <dd>{ownParticipant.result.eloChange > 0 ? '+' : ''}{ownParticipant.result.eloChange}</dd>
            </div>
            <div>
              <dt>ELO actual</dt>
              <dd>{ownParticipant.result.eloAfter}</dd>
            </div>
            <div>
              <dt>Acciones</dt>
              <dd>{battle.actionCount}</dd>
            </div>
          </dl>

          <BattleEquipment participants={battle.participants} />
          <BattleTechniques participants={battle.participants} events={battle.events} />
          <BattlePets participants={battle.participants} events={battle.events} />

          <BattleProgression
            progression={ownParticipant.result.progression}
            xpGained={ownParticipant.result.xpGained}
          />

          <section className="battle-events" aria-labelledby="battle-events-title">
            <BattleAnimation participants={battle.participants} events={battle.events} />
            <h2 id="battle-events-title">Secuencia del combate</h2>
            <ol>
              {battle.events.map((event, index) => (
                <li key={`${event.type}-${index}`}>
                  {formatBattleEvent(event, fighterNames, petNames)}
                </li>
              ))}
            </ol>
          </section>

          <p className="battle-result__version">Motor de combate {battle.engineVersion}</p>
        </article>
      )}
      <p className="auth-footer">Fieras de la Arena <span>·</span> La batalla comienza contigo</p>
    </main>
  )
}

export default BattleResultPage

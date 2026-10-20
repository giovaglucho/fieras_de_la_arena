import { getBattleActions } from './battleAnimation.js'

const ACTION_INTERVAL_MS = 650
const ACTION_ANIMATION_MS = 420

function getFighterAnimation(fighterId, side, actions) {
  const animations = []

  actions.forEach((action, index) => {
    const delay = index * ACTION_INTERVAL_MS

    if (action.attackerFighterId === fighterId) {
      animations.push(`battle-lunge-${side} ${ACTION_ANIMATION_MS}ms ease-in-out ${delay}ms both`)
    }
    if (action.targetFighterId === fighterId) {
      animations.push(`battle-hit-${side} 260ms ease ${delay + 160}ms both`)
    }
  })

  return animations.length > 0 ? animations.join(', ') : 'none'
}

export default function BattleAnimation({ participants, events }) {
  const actions = getBattleActions(events)

  if (!Array.isArray(participants) || participants.length !== 2) {
    return null
  }

  const [leftFighter, rightFighter] = participants.map(({ fighter }) => fighter)

  if (!leftFighter?.id || !rightFighter?.id) {
    return null
  }

  return (
    <section className="battle-animation" aria-labelledby="battle-animation-title">
      <h2 id="battle-animation-title">La pelea</h2>
      <p className="battle-animation__hint">
        Animación basada en los ataques guardados. El registro completo sigue debajo.
      </p>
      <div
        className="battle-animation__arena"
        role="img"
        aria-label={`Representación visual de ${leftFighter.name} contra ${rightFighter.name}, con ${actions.length} ataques registrados.`}
      >
        {[leftFighter, rightFighter].map((fighter, index) => {
          const side = index === 0 ? 'left' : 'right'

          return (
            <div className={`battle-animation__combatant battle-animation__combatant--${side}`} key={fighter.id}>
              {actions.map((action, actionIndex) =>
                action.targetFighterId === fighter.id ? (
                  <span
                    aria-hidden="true"
                    className={`battle-animation__impact battle-animation__impact--${side}`}
                    key={`${action.actionNumber}-${actionIndex}`}
                    style={{ animationDelay: `${actionIndex * ACTION_INTERVAL_MS + 160}ms` }}
                  >
                    {action.damage === null ? '¡Golpe!' : `-${action.damage}`}
                  </span>
                ) : null,
              )}
              <div
                aria-hidden="true"
                className={`battle-animation__fighter battle-animation__fighter--${side}`}
                style={{ animation: getFighterAnimation(fighter.id, side, actions) }}
              >
                <span className="battle-animation__head" />
                <span className="battle-animation__torso" />
                <span className="battle-animation__arm battle-animation__arm--front" />
                <span className="battle-animation__arm battle-animation__arm--back" />
                <span className="battle-animation__leg battle-animation__leg--front" />
                <span className="battle-animation__leg battle-animation__leg--back" />
              </div>
              <strong className="battle-animation__name">{fighter.name}</strong>
            </div>
          )
        })}
        <span className="battle-animation__arena-line" aria-hidden="true" />
      </div>
      <p className="battle-animation__motion-note">
        Con movimiento reducido, los luchadores se muestran sin animación.
      </p>
    </section>
  )
}

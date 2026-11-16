import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { createFighter } from '../api/fighters.js'
import { FIGHTER_APPEARANCE_FIELD_LABELS, FIGHTER_APPEARANCE_OPTIONS, NEUTRAL_FIGHTER_APPEARANCE } from '../fighterAppearance.js'
import { FIGHTER_NAME_HINT, cleanFighterName } from '../fighterName.js'
import Brand from '../components/Brand.jsx'
import FighterAppearancePreview from '../components/FighterAppearancePreview.jsx'

function CreateFighterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [appearance, setAppearance] = useState({ ...NEUTRAL_FIGHTER_APPEARANCE })
  const [fieldError, setFieldError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdFighter, setCreatedFighter] = useState(null)
  const creationRequestIds = useRef(new Map())

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedName = cleanFighterName(name)

    setFieldError('')
    setRequestError('')

    if (!normalizedName) {
      setFieldError(`El nombre no es válido. ${FIGHTER_NAME_HINT}`)
      return
    }

    const requestPayload = JSON.stringify({ name: normalizedName, appearance })
    let requestId = creationRequestIds.current.get(requestPayload)

    if (!requestId) {
      if (typeof globalThis.crypto?.randomUUID !== 'function') {
        setRequestError('Este navegador no puede enviar una creación segura. Actualízalo e inténtalo de nuevo.')
        return
      }
      requestId = globalThis.crypto.randomUUID()
      creationRequestIds.current.set(requestPayload, requestId)
    }

    setIsSubmitting(true)

    try {
      setCreatedFighter(await createFighter(normalizedName, { requestId, appearance }))
    } catch (error) {
      if (error.code === 'INVALID_FIGHTER_DATA' || error.code === 'FIGHTER_NAME_TAKEN') {
        setFieldError(error.message)
      } else {
        setRequestError(error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleChange() {
    setFieldError('')
    setRequestError('')
  }

  function handleAppearanceChange(event) {
    const { name: field, value } = event.target
    setAppearance((currentAppearance) => ({
      ...currentAppearance,
      [field]: value,
    }))
    handleChange()
  }

  return (
    <main className="auth-layout">
      <Brand />

      <section className="auth-card fighter-creation-card" aria-labelledby="fighter-title">
        <p className="eyebrow">Tu camino empieza aquí</p>
        <h1 id="fighter-title">Crea tu luchador</h1>
        <p className="auth-intro">
          Elige un nombre y una apariencia para tu fiera. Sus atributos iniciales los determina el servidor.
        </p>

        {createdFighter ? (
          <section className="fighter-creation-result" aria-labelledby="fighter-result-title" role="status">
            <div className="fighter-creation-result__heading">
              <span className="success-panel__icon" aria-hidden="true">✓</span>
              <div>
                <p className="eyebrow">Creación confirmada</p>
                <h2 id="fighter-result-title">{createdFighter.name}</h2>
              </div>
            </div>
            <div className="fighter-creation-result__details">
              <div>
                <FighterAppearancePreview
                  appearance={createdFighter.appearance}
                  name={createdFighter.name}
                />
                <p className="form-hint">Apariencia elegida</p>
              </div>
              <div className="fighter-creation-result__stats">
                <h3>Atributos asignados por el servidor</h3>
                <dl>
                  <div><dt>Vida</dt><dd>{createdFighter.baseStats.health}</dd></div>
                  <div><dt>Ataque</dt><dd>{createdFighter.baseStats.attack}</dd></div>
                  <div><dt>Defensa</dt><dd>{createdFighter.baseStats.defense}</dd></div>
                  <div><dt>Velocidad</dt><dd>{createdFighter.baseStats.speed}</dd></div>
                </dl>
                <p className="form-hint">
                  El servidor eligió un perfil inicial al azar. No se puede escoger ni repetir esa tirada.
                </p>
              </div>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Ir al panel
            </button>
          </section>
        ) : (
          <form className="auth-form fighter-creation-form" onSubmit={handleSubmit} onChange={handleChange} noValidate>
            <div className="fighter-creation-grid">
              <div className="fighter-creation-fields">
                <div className="form-field">
                  <label htmlFor="fighter-name">Nombre del luchador</label>
                  <input
                    id="fighter-name"
                    name="name"
                    type="text"
                    autoComplete="off"
                    maxLength={18}
                    placeholder="ej. Colmillo de Bronce"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? 'fighter-name-error' : 'fighter-name-hint'}
                  />
                  {fieldError ? (
                    <p className="field-error" id="fighter-name-error" role="alert">
                      {fieldError}
                    </p>
                  ) : (
                    <p className="form-hint" id="fighter-name-hint">
                      {FIGHTER_NAME_HINT}
                    </p>
                  )}
                </div>

                <fieldset className="fighter-appearance-fields">
                  <legend>Apariencia (solo estética)</legend>
                  {Object.entries(FIGHTER_APPEARANCE_OPTIONS).map(([field, options]) => (
                    <div className="form-field" key={field}>
                      <label htmlFor={`fighter-${field}`}>
                        {FIGHTER_APPEARANCE_FIELD_LABELS[field]}
                      </label>
                      <select
                        id={`fighter-${field}`}
                        name={field}
                        value={appearance[field]}
                        onChange={handleAppearanceChange}
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </fieldset>
              </div>

              <aside className="fighter-creation-preview" aria-labelledby="fighter-preview-title">
                <h2 id="fighter-preview-title">Vista de apariencia</h2>
                <FighterAppearancePreview appearance={appearance} name={name.trim()} />
                <p className="form-hint">
                  La vista refleja únicamente las opciones visuales. No anticipa atributos ni resultados de combate.
                </p>
              </aside>
            </div>

            <p className="fighter-creation-random-note">
              Al crear, el servidor sortea un perfil inicial de atributos. No puedes elegirlo ni repetirlo; la apariencia no cambia el combate.
            </p>
            {requestError && <p className="request-error" role="alert">{requestError}</p>}

            <button
              className="button button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creando luchador…' : 'Crear luchador'}
            </button>
          </form>
        )}
      </section>
      <p className="auth-footer">Fieras de la Arena <span>·</span> Una fiera, una leyenda</p>
    </main>
  )
}

export default CreateFighterPage



function Field({ id, label, error, hint, ...inputProps }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const descriptionId = error ? errorId : hint ? hintId : undefined

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...inputProps}
      />
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="form-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}

export default Field

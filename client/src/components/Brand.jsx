import { Link } from 'react-router-dom'

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Fieras de la Arena, inicio">
      <span className="brand__mark" aria-hidden="true">FA</span>
      <span>Fieras <span className="brand__muted">de la Arena</span></span>
    </Link>
  )
}

export default Brand

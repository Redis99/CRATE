interface ERIconProps {
  size?: number
  className?: string
}

/**
 * Ícone de Extraction Rate — Broca Estilizada
 * Cone invertido (afunila para baixo) com três linhas horizontais
 * representando as estrias da broca, ponto sólido na ponta e
 * pequenas faíscas indicando extração ativa.
 */
export function ERIcon({ size = 18, className = '' }: ERIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Corpo da broca — cone invertido */}
      <path d="M3.5 2.5h11L9 13z" />

      {/* Estrias horizontais da broca (três linhas que afunilam) */}
      <line x1="5.5" y1="5.5" x2="12.5" y2="5.5" />
      <line x1="6.75" y1="8.5" x2="11.25" y2="8.5" />
      <line x1="8" y1="11" x2="10" y2="11" />

      {/* Ponta sólida — indica contato com a superfície */}
      <circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />

      {/* Faíscas — indicam extração ativa */}
      <line x1="9" y1="14" x2="7.5" y2="16" strokeWidth="1.2" />
      <line x1="9" y1="14" x2="10.5" y2="16" strokeWidth="1.2" />
      <line x1="9" y1="14" x2="6.5" y2="15" strokeWidth="1.2" />
      <line x1="9" y1="14" x2="11.5" y2="15" strokeWidth="1.2" />
    </svg>
  )
}

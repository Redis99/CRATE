/**
 * Utilitários de formatação compartilhados — sem dependências de servidor.
 */

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day:   '2-digit',
    year:  '2-digit',
    hour:  '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

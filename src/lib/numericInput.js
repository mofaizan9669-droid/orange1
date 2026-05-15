/** Digits + optional single decimal point; letters/symbols stripped. */
export function sanitizeDecimalInput(raw) {
  const s = String(raw ?? '')
  if (s === '') return ''
  let out = ''
  let dot = false
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      out += ch
      continue
    }
    if (ch === '.' && !dot) {
      dot = true
      out += ch
    }
  }
  return out
}

export function parseDecimalAmount(raw) {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s || s === '.') return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export const fmt = {
  price: (v?: number | null) =>
    v == null ? '—' : `৳${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  qty: (v?: number | null) =>
    v == null ? '—' : v.toLocaleString('en-BD'),
  pct: (v?: number | null) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
  date: (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('en-BD') : '—',
  datetime: (s?: string | null) =>
    s ? new Date(s).toLocaleString('en-BD') : '—',
  compact: (v?: number | null) => {
    if (v == null) return '—'
    if (Math.abs(v) >= 1e7) return `৳${(v / 1e7).toFixed(2)}Cr`
    if (Math.abs(v) >= 1e5) return `৳${(v / 1e5).toFixed(2)}L`
    return fmt.price(v)
  },
}

export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ')

export const changeClass = (v?: number | null) =>
  v == null ? '' : v >= 0 ? 'text-bull' : 'text-bear'

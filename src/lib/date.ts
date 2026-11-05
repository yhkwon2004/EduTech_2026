export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')

/** 로컬 시간 기준 YYYY-MM-DD */
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): string {
  return toKey(now)
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function diffDays(from: string, to: string): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86400000)
}

export function weekday(key: string): number {
  return fromKey(key).getDay()
}

/** "11월 4일 (수)" */
export function formatKo(key: string, opts: { weekday?: boolean; year?: boolean } = { weekday: true }): string {
  const d = fromKey(key)
  const base = `${opts.year ? `${d.getFullYear()}년 ` : ''}${d.getMonth() + 1}월 ${d.getDate()}일`
  return opts.weekday === false ? base : `${base} (${WEEKDAY_KO[d.getDay()]})`
}

/** 일요일 시작 주의 7일 */
export function weekOf(key: string): string[] {
  const start = addDays(key, -weekday(key))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 달력 6주 x 7일 */
export function monthMatrix(year: number, month: number): string[] {
  const first = toKey(new Date(year, month, 1))
  const start = addDays(first, -weekday(first))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function nowMin(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

/** "오후 2:30" */
export function formatTime(t?: string): string {
  if (!t) return '종일'
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? '오전' : '오후'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${ampm} ${hh}:${pad(m)}`
}

/** 주말이면 다음 월요일 (공휴일은 반영하지 않음) */
export function nextBusinessDay(key: string): string {
  const w = weekday(key)
  if (w === 6) return addDays(key, 2)
  if (w === 0) return addDays(key, 1)
  return key
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return formatKo(toKey(new Date(iso)), { weekday: false })
}

export function dDayLabel(from: string, to: string): string {
  const n = diffDays(from, to)
  if (n === 0) return 'D-DAY'
  return n > 0 ? `D-${n}` : `D+${-n}`
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 6) return '늦은 시간까지 수고 많으세요'
  if (h < 11) return '좋은 아침이에요'
  if (h < 14) return '점심 장사 힘내세요'
  if (h < 18) return '오후도 힘내세요'
  return '오늘도 수고 많으셨어요'
}

import type {
  BizType,
  CategoryId,
  Challenge,
  ChallengeLogEntry,
  EventType,
  Occurrence,
  QuickTodo,
  RoutineTemplate,
  SlotId,
  TaskTag,
} from '@/types'
import { SLOTS } from '@/data/routines'
import { CHALLENGES, RANKS } from '@/data/challenges'
import { defaultOn } from '@/data/routines'
import { addDays, fromKey, minToTime, timeToMin, weekday } from './date'

export interface SlotRange {
  id: SlotId
  label: string
  short: string
  icon: string
  hint: string
  start: number
  end: number
}

const DAY_END = 24 * 60 - 1

/**
 * 영업시간에 맞춰 하루를 6칸으로 나눕니다.
 * 오픈 전(오픈 1시간 전~) · 오전(~11:30) · 점심(~14:00) · 쉬는 시간(~17:00) · 저녁(~마감 30분 전) · 마감
 * 영업시간 밖에 있는 칸은 숨깁니다 (예: 16시에 닫는 카페는 '저녁' 없음).
 */
export function slotRanges(openTime: string, closeTime: string): SlotRange[] {
  const open = timeToMin(openTime)
  let close = timeToMin(closeTime)
  if (close <= open) close = DAY_END // 자정 넘어 영업
  const lastStart = Math.max(open, close - 30)
  const clamp = (v: number) => Math.min(Math.max(v, open), lastStart)
  const bounds: Record<SlotId, [number, number]> = {
    open: [Math.max(0, open - 60), open],
    morning: [open, clamp(11 * 60 + 30)],
    lunch: [clamp(11 * 60 + 30), clamp(14 * 60)],
    break: [clamp(14 * 60), clamp(17 * 60)],
    evening: [clamp(17 * 60), lastStart],
    close: [lastStart, Math.min(DAY_END, close + 30)],
  }
  return SLOTS.filter((s) => s.id === 'open' || s.id === 'close' || bounds[s.id][1] - bounds[s.id][0] > 0).map((s) => ({
    ...s,
    start: bounds[s.id][0],
    end: bounds[s.id][1],
  }))
}

export function slotLabelTime(r: SlotRange): string {
  return `${minToTime(r.start)}–${minToTime(r.end)}`
}

/** 지금 시각이 속한 칸 */
export function currentSlot(ranges: SlotRange[], now: number): SlotId {
  if (now < ranges[0].start) return 'open'
  const hit = ranges.find((r) => now >= r.start && now < r.end)
  return hit ? hit.id : 'close'
}

/** 숨겨진 칸에 배정된 할 일은 가장 가까운 칸으로 (동점이면 앞 칸) */
export function resolveSlot(slot: SlotId, ranges: SlotRange[]): SlotId {
  if (ranges.some((r) => r.id === slot)) return slot
  const order = SLOTS.map((s) => s.id)
  const idx = order.indexOf(slot)
  let best = ranges[0].id
  let bestD = Infinity
  for (const r of ranges) {
    const d = Math.abs(order.indexOf(r.id) - idx)
    if (d < bestD) {
      bestD = d
      best = r.id
    }
  }
  return best
}

function slotAt(ranges: SlotRange[], min: number): SlotId {
  if (min < ranges[0].start) return 'open'
  const hit = ranges.find((r) => min >= r.start && min < r.end)
  return hit ? hit.id : 'close'
}

export function routineOccurs(r: RoutineTemplate, date: string): boolean {
  if (r.freq === 'daily') return true
  if (r.freq === 'weekly') return weekday(date) === (r.weekday ?? 1)
  return fromKey(date).getDate() === (r.monthDay ?? 1)
}

/** 켜져 있는 루틴 (업종 기본값 + 사용자가 켜고 끈 것 + 직접 만든 것) */
export function enabledRoutines(params: {
  templates: RoutineTemplate[]
  custom: RoutineTemplate[]
  biz: BizType
  on: string[]
  off: string[]
  weekdayOverride: Record<string, number>
}): RoutineTemplate[] {
  const { templates, custom, biz, on, off, weekdayOverride } = params
  const base = templates.filter((r) => (defaultOn(r, biz) ? !off.includes(r.id) : on.includes(r.id)))
  const mine = custom.filter((r) => !off.includes(r.id))
  return [...base, ...mine].map((r) => (weekdayOverride[r.id] !== undefined ? { ...r, weekday: weekdayOverride[r.id] } : r))
}

export interface TodayItem {
  key: string
  kind: 'routine' | 'todo' | 'event'
  title: string
  slot: SlotId
  minutes?: number
  tag?: TaskTag
  time?: string
  done: boolean
  tip?: string
  lessonId?: string
  auto?: 'learn'
  freq?: RoutineTemplate['freq']
  challengeId?: string
  sourceId: string
}

const EVENT_TAG: Record<EventType, TaskTag> = {
  store: 'ops',
  order: 'ops',
  learn: 'learn',
  personal: 'care',
  deadline: 'tax',
}

export function buildToday(params: {
  date: string
  ranges: SlotRange[]
  routines: RoutineTemplate[]
  todos: QuickTodo[]
  occurrences: Occurrence[]
  doneKeys: string[]
  learnedToday: boolean
}): TodayItem[] {
  const { date, ranges, routines, todos, occurrences, doneKeys, learnedToday } = params
  const done = new Set(doneKeys)
  const items: TodayItem[] = []

  for (const r of routines) {
    if (!routineOccurs(r, date)) continue
    const key = `r:${r.id}`
    items.push({
      key,
      kind: 'routine',
      title: r.title,
      slot: resolveSlot(r.slot, ranges),
      minutes: r.minutes,
      tag: r.tag,
      done: r.auto === 'learn' ? learnedToday || done.has(key) : done.has(key),
      tip: r.tip,
      lessonId: r.lessonId,
      auto: r.auto,
      freq: r.freq,
      sourceId: r.id,
    })
  }

  for (const o of occurrences) {
    if (o.event.type === 'deadline') continue // 마감은 상단 D-day로 따로 보여 줌
    items.push({
      key: `ev:${o.event.id}`,
      kind: 'event',
      title: o.event.title,
      slot: o.event.start ? slotAt(ranges, timeToMin(o.event.start)) : 'open',
      tag: EVENT_TAG[o.event.type],
      time: o.event.start,
      done: o.done,
      lessonId: o.event.lessonId,
      sourceId: o.event.id,
    })
  }

  for (const t of todos) {
    if (t.date !== date) continue
    items.push({
      key: `todo:${t.id}`,
      kind: 'todo',
      title: t.title,
      slot: resolveSlot(t.slot, ranges),
      done: done.has(`todo:${t.id}`),
      challengeId: t.challengeId,
      sourceId: t.id,
    })
  }

  const order = ranges.map((r) => r.id)
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const s = order.indexOf(a.it.slot) - order.indexOf(b.it.slot)
      if (s) return s
      // 같은 칸: 시간 있는 일정은 시간순, 나머지는 원래 순서
      if (a.it.time && b.it.time) return a.it.time.localeCompare(b.it.time)
      return a.i - b.i
    })
    .map((x) => x.it)
}

/** 지난 7일 안에 못 끝낸 '오늘만 할 일' */
export function carryOverTodos(todos: QuickTodo[], taskDone: Record<string, string[]>, today: string): QuickTodo[] {
  const from = addDays(today, -7)
  return todos.filter((t) => t.date < today && t.date >= from && !(taskDone[t.date] ?? []).includes(`todo:${t.id}`))
}

/* ───────── 오늘의 도전 ───────── */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 하루 3개 — ① 관심 분야 ② 다른 분야 ③ 1~2분짜리 또는 컨디션 챙기기
 * 같은 날에는 같은 도전이 나오고, '다른 도전' 버튼(shuffle)으로 바꿀 수 있어요.
 * 최근 7일(오늘 제외) 안에 한 도전은 빼고 고릅니다.
 */
export function dailyChallenges(params: {
  date: string
  interests: CategoryId[]
  log: ChallengeLogEntry[]
  shuffle?: number
  pool?: Challenge[]
}): Challenge[] {
  const { date, interests, log, shuffle = 0, pool = CHALLENGES } = params
  const from = addDays(date, -7)
  const recent = new Set(log.filter((l) => l.date >= from && l.date < date).map((l) => l.id))
  const fresh = pool.filter((c) => !recent.has(c.id))
  const base = fresh.length >= 3 ? fresh : pool
  const r = rng(hash(`${date}#${shuffle}`))
  const pick = (list: Challenge[], taken: Challenge[]) => {
    const avail = list.filter((c) => !taken.includes(c))
    return avail.length ? avail[Math.floor(r() * avail.length)] : null
  }
  const taken: Challenge[] = []
  const tags = interests as string[]
  const groups = [
    base.filter((c) => tags.includes(c.tag) && c.level <= 2),
    base.filter((c) => !tags.includes(c.tag) && c.tag !== 'care'),
    base.filter((c) => c.minutes <= 2 || c.tag === 'care'),
  ]
  for (const g of groups) {
    const c = pick(g, taken) ?? pick(base, taken)
    if (c) taken.push(c)
  }
  return taken
}

export function challengePoints(log: ChallengeLogEntry[], pool: Challenge[] = CHALLENGES): number {
  const map = new Map(pool.map((c) => [c.id, c.points]))
  return log.reduce((s, l) => s + (map.get(l.id) ?? 0), 0)
}

/** 포인트 = 도전 포인트 + 체크한 루틴 1개당 1점 */
export function totalPoints(log: ChallengeLogEntry[], taskDone: Record<string, string[]>): number {
  const checks = Object.values(taskDone).reduce((n, keys) => n + keys.filter((k) => k.startsWith('r:')).length, 0)
  return challengePoints(log) + checks
}

export function rankFor(points: number): { name: string; min: number; next?: { name: string; min: number }; progress: number } {
  let i = 0
  while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++
  const cur = RANKS[i]
  const next = RANKS[i + 1]
  return {
    name: cur.name,
    min: cur.min,
    next,
    progress: next ? (points - cur.min) / (next.min - cur.min) : 1,
  }
}

import type { LessonProgress } from '@/types'
import { LESSON_MAP } from '@/data/courses'
import { BUILD_MAP, BUILDINGS, BUILDING_MAP, type BuildDef, type BuildingId } from './map'
import { levelOf } from './store'

export type BuildState = 'done' | 'building' | 'finished' | 'ready' | 'locked'

export interface BuildStatus {
  def: BuildDef
  state: BuildState
  /** 공사가 끝나는 시각 */
  readyAt?: number
  /** 못 짓는 이유들 (레슨·레벨·돈) */
  missing: { kind: 'lesson' | 'level' | 'cash'; text: string; lessonId?: string }[]
  lessonTitle?: string
}

/** 건물 하나의 상태 */
export function buildStatus(
  id: BuildingId,
  w: { buildings: Record<string, number>; cash: number; exp: number; counters: Record<string, number> },
  progress: Record<string, LessonProgress>,
  now = Date.now(),
): BuildStatus | null {
  const def = BUILD_MAP[id]
  if (!def) return null
  const at = w.buildings[id]
  const lessonTitle = def.lesson ? LESSON_MAP[def.lesson]?.title : undefined
  if (at !== undefined) {
    if (at === 0) return { def, state: 'done', missing: [], lessonTitle }
    if (at <= now) return { def, state: 'finished', readyAt: at, missing: [], lessonTitle }
    return { def, state: 'building', readyAt: at, missing: [], lessonTitle }
  }
  const missing: BuildStatus['missing'] = []
  if (def.lesson && !progress[def.lesson]?.done) missing.push({ kind: 'lesson', text: `배움터 「${lessonTitle}」 스테이지 깨기`, lessonId: def.lesson })
  if (levelOf(w.exp).level < def.level) missing.push({ kind: 'level', text: `레벨 ${def.level} 이상` })
  if (w.cash < def.cost) missing.push({ kind: 'cash', text: `${def.cost.toLocaleString()}원 (${(def.cost - w.cash).toLocaleString()}원 부족)` })
  return { def, state: missing.length ? 'locked' : 'ready', missing, lessonTitle }
}

/** 지어졌는지 (처음부터 있던 건물 포함) */
export function isBuilt(buildings: Record<string, number>, id: BuildingId) {
  return buildings[id] === 0 || (!BUILD_MAP[id] && buildings[id] !== undefined) || (!BUILD_MAP[id] && buildings[id] === undefined)
}

export function buildingName(id: BuildingId) {
  return BUILDING_MAP[id]?.name ?? id
}

export const BUILD_ORDER = BUILDINGS.filter((b) => BUILD_MAP[b.id]).map((b) => b.id)

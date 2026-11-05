import type { CategoryId, LessonProgress } from '@/types'
import { COURSES } from '@/data/courses'
import type { Skills } from './sim'

/** 앱에서 끝낸 레슨 수 = 게임 노하우 레벨 */
export function skillsFromProgress(progress: Record<string, LessonProgress>): Skills {
  const out: Skills = { marketing: 0, digital: 0, tax: 0, service: 0, ops: 0, support: 0, labor: 0, hygiene: 0 }
  for (const c of COURSES) for (const l of c.lessons) if (progress[l.id]?.done) out[c.category]++
  return out
}

export function skillMax(cat: CategoryId): number {
  return COURSES.filter((c) => c.category === cat).reduce((n, c) => n + c.lessons.length, 0)
}

/** 노하우가 게임에서 하는 일 */
export const SKILL_EFFECT: Record<CategoryId, string> = {
  marketing: '홍보 효과 +8% / Lv',
  digital: 'Lv1부터 배달앱 광고 해금 · 홍보 +4% / Lv',
  service: '손님 끌기 +2% · 평판 회복 / Lv',
  ops: '재료 원가 -3% / Lv',
  tax: '임대료 등 고정비 -3% / Lv',
  support: 'Lv1부터 투자 비용 -5% / Lv',
  labor: '알바 1명이 받는 손님 +10% / Lv',
  hygiene: '매일 평판 +0.01 / Lv',
}

/** 실제 '오늘 할 일'·도전 달성 → 게임 손님 버프 (최대 15%) */
export function realLifeBuff(todoRatio: number, challengesToday: number): number {
  return Math.min(0.15, Math.round((0.08 * todoRatio + 0.02 * challengesToday) * 1000) / 1000)
}

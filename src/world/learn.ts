import type { CategoryId, Lesson, LessonProgress, Quiz } from '@/types'
import { COURSES, COURSE_MAP } from '@/data/courses'
import { hash, rng } from '@/lib/rng'

/**
 * 배움을 게임처럼
 * - 레슨 = 스테이지 (별 1~3개), 코스 = 챕터 (다 깨면 보물상자 → 꾸미기 아이템 해금)
 * - 배운 레슨은 지식 카드로 도감에 모여요
 * - 배움 나무: 끝낸 레슨 수만큼 자라요
 */

export const CAT_EMOJI: Record<CategoryId, string> = {
  marketing: '📣',
  digital: '📱',
  tax: '🧾',
  service: '😊',
  ops: '📦',
  support: '🏛️',
  labor: '🤝',
  hygiene: '🧼',
}

export interface CourseReward {
  kind: 'hat' | 'glasses' | 'hairColor'
  value: number | string
  label: string
  emoji: string
}

/** 코스를 다 끝내면 받는 꾸미기 아이템 */
export const COURSE_REWARDS: Record<string, CourseReward> = {
  'c-place': { kind: 'hat', value: 1, label: '야구모자', emoji: '🧢' },
  'c-insta': { kind: 'glasses', value: 3, label: '선글라스', emoji: '🕶️' },
  'c-delivery': { kind: 'hat', value: 2, label: '비니', emoji: '🧶' },
  'c-tax': { kind: 'glasses', value: 2, label: '네모 안경', emoji: '👓' },
  'c-service': { kind: 'hat', value: 4, label: '리본 머리띠', emoji: '🎀' },
  'c-cost': { kind: 'glasses', value: 1, label: '동그란 안경', emoji: '🤓' },
  'c-support': { kind: 'hat', value: 5, label: '밀짚모자', emoji: '👒' },
  'c-labor': {
    kind: 'hairColor',
    value: '#8E6BBF',
    label: '라벤더 머리색',
    emoji: '💜',
  },
  'c-hygiene': { kind: 'hat', value: 3, label: '요리사 모자', emoji: '👨‍🍳' },
}

export function courseDone(courseId: string, progress: Record<string, LessonProgress>) {
  return COURSE_MAP[courseId].lessons.every((l) => progress[l.id]?.done)
}

/** 아직 잠긴 꾸미기 (→ 어느 코스에서 열리는지) */
export function lockedCosmetics(progress: Record<string, LessonProgress>) {
  const hats = new Map<number, string>()
  const glasses = new Map<number, string>()
  const hairColors = new Map<string, string>()
  for (const [cid, r] of Object.entries(COURSE_REWARDS)) {
    if (courseDone(cid, progress)) continue
    const title = COURSE_MAP[cid].title
    if (r.kind === 'hat') hats.set(r.value as number, title)
    if (r.kind === 'glasses') glasses.set(r.value as number, title)
    if (r.kind === 'hairColor') hairColors.set(r.value as string, title)
  }
  return { hats, glasses, hairColors }
}

/** 별: 정답률로 */
export function starsFor(correct: number, total: number) {
  if (!total) return 3
  const r = correct / total
  return r >= 1 ? 3 : r >= 0.6 ? 2 : 1
}

export function lessonStars(lessonId: string, stars: Record<string, number>, progress: Record<string, LessonProgress>) {
  if (!progress[lessonId]?.done) return 0
  return stars[lessonId] ?? ((progress[lessonId]?.score ?? 100) >= 100 ? 3 : (progress[lessonId]?.score ?? 0) >= 50 ? 2 : 1)
}

/** 레슨 퀴즈 + 같은 코스(없으면 같은 분야)에서 뽑은 보너스 문제로 3문제 */
export function stageQuestions(lesson: Lesson & { courseId?: string }, courseId: string, seed: string): { quiz: Quiz; bonus: boolean; index: number }[] {
  const own = lesson.quiz.map((quiz, index) => ({ quiz, bonus: false, index }))
  if (own.length >= 3) return own.slice(0, 3)
  const course = COURSE_MAP[courseId]
  const pool: Quiz[] = []
  for (const l of course.lessons) if (l.id !== lesson.id) pool.push(...l.quiz)
  if (pool.length < 3 - own.length) for (const c of COURSES) if (c.category === course.category && c.id !== courseId) for (const l of c.lessons) pool.push(...l.quiz)
  const r = rng(hash(`stage:${lesson.id}:${seed}`))
  const picked = [...pool].sort(() => r() - 0.5).slice(0, 3 - own.length)
  return [...own, ...picked.map((quiz) => ({ quiz, bonus: true, index: -1 }))]
}

/** 배움 나무 단계 */
export const TREE_STAGES = [
  { need: 0, name: '씨앗', emoji: '🌰', desc: '첫 레슨을 들으면 싹이 터요' },
  { need: 1, name: '새싹', emoji: '🌱', desc: '작은 잎이 났어요' },
  { need: 4, name: '어린 나무', emoji: '🌿', desc: '조금씩 키가 자라요' },
  { need: 9, name: '든든한 나무', emoji: '🌳', desc: '그늘이 생겼어요' },
  {
    need: 16,
    name: '꽃 피는 나무',
    emoji: '🌸',
    desc: '배움이 꽃으로 피었어요',
  },
  {
    need: 27,
    name: '황금 열매 나무',
    emoji: '✨',
    desc: '모든 레슨을 마친 동네 최고의 나무',
  },
]

export function treeStage(done: number) {
  let i = 0
  for (let k = 0; k < TREE_STAGES.length; k++) if (done >= TREE_STAGES[k].need) i = k
  const next = TREE_STAGES[i + 1]
  return {
    index: i,
    stage: TREE_STAGES[i],
    next,
    progress: next ? (done - TREE_STAGES[i].need) / (next.need - TREE_STAGES[i].need) : 1,
  }
}

export const TOTAL_LESSONS = COURSES.reduce((n, c) => n + c.lessons.length, 0)

/** 연속 학습일 (오늘 또는 어제까지 이어진 날 수) */
export function learnStreak(logs: { date: string }[], today: string) {
  const days = new Set(logs.map((l) => l.date))
  const d = new Date(`${today}T00:00:00`)
  if (!days.has(today)) d.setDate(d.getDate() - 1)
  let n = 0
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!days.has(k)) break
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/** 코스 안 스테이지 상태: 앞 레슨을 끝내야 다음이 열려요 */
export function stageState(courseId: string, index: number, progress: Record<string, LessonProgress>): 'done' | 'current' | 'locked' {
  const lessons = COURSE_MAP[courseId].lessons
  if (progress[lessons[index].id]?.done) return 'done'
  const firstOpen = lessons.findIndex((l) => !progress[l.id]?.done)
  return index === firstOpen ? 'current' : 'locked'
}

/** 다음에 할 스테이지 (같은 코스 → 다음 코스) */
export function nextStage(afterLessonId: string | null, progress: Record<string, LessonProgress>): { courseId: string; lessonId: string } | null {
  const order = COURSES.flatMap((c) => c.lessons.map((l) => ({ courseId: c.id, lessonId: l.id })))
  const from = afterLessonId ? order.findIndex((o) => o.lessonId === afterLessonId) : -1
  const rest = [...order.slice(from + 1), ...order.slice(0, from + 1)]
  return rest.find((o) => !progress[o.lessonId]?.done) ?? null
}

export function totalStars(stars: Record<string, number>, progress: Record<string, LessonProgress>) {
  return COURSES.reduce((n, c) => n + c.lessons.reduce((m, l) => m + lessonStars(l.id, stars, progress), 0), 0)
}

/* ───────── 동네 사람 OX 퀴즈 ───────── */
export const NPC_QUIZ_DAILY = 5

export interface OxQuiz {
  lessonId: string
  q: string
  claim: string
  truth: boolean
  explain: string
  correctText: string
}

/** 레슨 퀴즈 하나를 OX로 (맞는 보기 또는 틀린 보기를 내밀어요). 배운 레슨을 먼저 */
export function makeOxQuiz(progress: Record<string, LessonProgress>, seed: string): OxQuiz {
  const r = rng(hash(`ox:${seed}`))
  const all = COURSES.flatMap((c) => c.lessons.flatMap((l) => l.quiz.map((q) => ({ l, q }))))
  const learned = all.filter((x) => progress[x.l.id]?.done)
  const pool = learned.length && r() < 0.7 ? learned : all
  const { l, q } = pool[Math.floor(r() * pool.length)]
  const truth = r() < 0.5
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer)
  const pick = truth ? q.answer : wrong[Math.floor(r() * wrong.length)]
  return { lessonId: l.id, q: q.q, claim: q.options[pick], truth, explain: q.explain, correctText: q.options[q.answer] }
}

export function npcQuizLeft(npcQuiz: { date: string; count: number }, today: string) {
  return Math.max(0, NPC_QUIZ_DAILY - (npcQuiz.date === today ? npcQuiz.count : 0))
}

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Answer,
  CategoryId,
  ChallengeLogEntry,
  LearnLog,
  LessonProgress,
  Profile,
  Question,
  QuickTodo,
  ReviewItem,
  RoutineTemplate,
  ScheduleEvent,
  Settings,
  SlotId,
} from '@/types'
import { seedQuestions } from '@/data/community'
import { addDays, todayKey } from '@/lib/date'
import { searchAll } from '@/lib/match'
import { LESSON_MAP } from '@/data/courses'
import { ROUTINE_MAP, defaultOn } from '@/data/routines'

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_PROFILE: Profile = {
  name: '',
  shopName: '',
  bizType: 'food',
  interests: [],
  dailyGoal: 5,
  openTime: '10:00',
  closeTime: '21:00',
}

const DEFAULT_SETTINGS: Settings = {
  largeText: false,
  showTaxCalendar: true,
  notify: true,
  speechRate: 1,
}

/**
 * v1에서 온보딩 때 자동으로 넣던 루틴 일정 — 이제 '오늘 할 일' 루틴이 대신하므로 v2 마이그레이션에서 지웁니다.
 * (제목과 메모가 자동 생성 그대로인 것만)
 */
const V1_STARTERS: Record<string, string> = {
  '오픈 준비': '청소 · 재료 손질 · 냉장고 온도 기록',
  '식자재 발주 확인': '재고 확인 후 부족한 것만 주문',
  '주간 재고 점검': '선입선출 정리 · 개봉일 라벨 확인',
  '마감 정산': '매출 확인 · 영수증 정리',
}
export function isV1Starter(e: Pick<ScheduleEvent, 'title' | 'memo'>): boolean {
  return V1_STARTERS[e.title] !== undefined && V1_STARTERS[e.title] === e.memo
}

interface AppState {
  onboarded: boolean
  profile: Profile
  settings: Settings
  progress: Record<string, LessonProgress>
  logs: LearnLog[]
  bookmarks: string[]
  notes: Record<string, string>
  review: ReviewItem[]
  events: ScheduleEvent[]
  presetDone: Record<string, boolean>
  questions: Question[]
  readNotifs: string[]
  lastLessonId?: string

  /** 오늘 할 일: 루틴 켜기/끄기, 요일 변경, 직접 만든 루틴 */
  routineOn: string[]
  routineOff: string[]
  routineWeekday: Record<string, number>
  customRoutines: RoutineTemplate[]
  /** 날짜별 완료한 항목 키 ('r:루틴id' | 'todo:할일id') */
  taskDone: Record<string, string[]>
  quickTodos: QuickTodo[]
  challengeLog: ChallengeLogEntry[]
  challengeShuffle: Record<string, number>

  completeOnboarding: (p: Profile) => void
  updateProfile: (p: Partial<Profile>) => void
  updateSettings: (s: Partial<Settings>) => void

  setCard: (lessonId: string, card: number) => void
  completeLesson: (lessonId: string, correct: boolean[]) => void
  toggleBookmark: (id: string) => void
  setNote: (lessonId: string, text: string) => void
  resolveReview: (lessonId: string, quizIndex: number) => void

  addEvent: (e: Omit<ScheduleEvent, 'id' | 'doneOn'>) => string
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  deleteEvent: (id: string) => void
  toggleDone: (event: ScheduleEvent, date: string) => void

  addQuestion: (q: { category: CategoryId; title: string; body: string }) => string
  toggleLike: (questionId: string) => void
  addAnswer: (questionId: string, body: string) => void
  toggleHelpful: (questionId: string, answerId: string) => void
  deleteQuestion: (questionId: string) => void

  markRead: (ids: string[]) => void
  resetAll: () => void

  toggleTask: (date: string, key: string) => void
  addTodo: (t: { title: string; slot: SlotId; date: string; challengeId?: string }) => string
  updateTodo: (id: string, patch: Partial<Omit<QuickTodo, 'id'>>) => void
  deleteTodo: (id: string) => void
  setRoutineEnabled: (id: string, on: boolean) => void
  setRoutineWeekday: (id: string, weekday: number) => void
  addCustomRoutine: (r: Omit<RoutineTemplate, 'id' | 'custom'>) => void
  deleteCustomRoutine: (id: string) => void
  completeChallenge: (id: string, date: string, note?: string) => void
  undoChallenge: (id: string, date: string) => void
  shuffleChallenges: (date: string) => void
}

/** 최근 90일치만 남겨 저장 공간을 아낌 */
function pruneDays<T>(map: Record<string, T>, today: string): Record<string, T> {
  const from = addDays(today, -90)
  return Object.fromEntries(Object.entries(map).filter(([d]) => d >= from))
}

const initial = () => ({
  onboarded: false,
  profile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  progress: {},
  logs: [],
  bookmarks: [],
  notes: {},
  review: [],
  events: [],
  presetDone: {},
  questions: seedQuestions(),
  readNotifs: [],
  lastLessonId: undefined,
  routineOn: [],
  routineOff: [],
  routineWeekday: {},
  customRoutines: [],
  taskDone: {},
  quickTodos: [],
  challengeLog: [],
  challengeShuffle: {},
})

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      completeOnboarding: (p) => set({ onboarded: true, profile: p }),
      updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      setCard: (lessonId, card) =>
        set({
          lastLessonId: lessonId,
          progress: {
            ...get().progress,
            [lessonId]: { ...(get().progress[lessonId] ?? { done: false, card: 0 }), card },
          },
        }),

      completeLesson: (lessonId, correct) => {
        const lesson = LESSON_MAP[lessonId]
        if (!lesson) return
        const today = todayKey()
        const prev = get().progress[lessonId]
        const score = correct.length ? Math.round((correct.filter(Boolean).length / correct.length) * 100) : 100
        const wrong = correct.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
        const review = get().review.filter((r) => r.lessonId !== lessonId || wrong.includes(r.quizIndex))
        for (const i of wrong) {
          if (!review.some((r) => r.lessonId === lessonId && r.quizIndex === i))
            review.push({ lessonId, quizIndex: i, addedAt: new Date().toISOString() })
        }
        set({
          lastLessonId: lessonId,
          progress: {
            ...get().progress,
            [lessonId]: {
              card: 0,
              done: true,
              completedAt: prev?.completedAt ?? new Date().toISOString(),
              score: Math.max(score, prev?.score ?? 0),
            },
          },
          logs: [...get().logs, { date: today, minutes: lesson.minutes, lessonId }],
          review,
        })
      },

      toggleBookmark: (id) => {
        const b = get().bookmarks
        set({ bookmarks: b.includes(id) ? b.filter((x) => x !== id) : [id, ...b] })
      },
      setNote: (lessonId, text) => {
        const notes = { ...get().notes }
        if (text.trim()) notes[lessonId] = text
        else delete notes[lessonId]
        set({ notes })
      },
      resolveReview: (lessonId, quizIndex) =>
        set({ review: get().review.filter((r) => !(r.lessonId === lessonId && r.quizIndex === quizIndex)) }),

      addEvent: (e) => {
        const id = uid('ev')
        set({ events: [...get().events, { ...e, id, doneOn: {} }] })
        return id
      },
      updateEvent: (id, patch) => set({ events: get().events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      deleteEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      toggleDone: (event, date) => {
        if (event.preset) {
          set({ presetDone: { ...get().presetDone, [event.id]: !get().presetDone[event.id] } })
          return
        }
        set({
          events: get().events.map((e) =>
            e.id === event.id ? { ...e, doneOn: { ...e.doneOn, [date]: !e.doneOn[date] } } : e,
          ),
        })
      },

      addQuestion: ({ category, title, body }) => {
        const id = uid('q')
        const now = new Date().toISOString()
        const p = get().profile
        const found = searchAll(`${title} ${body}`, [], 3)
        const links: Answer['links'] = [
          ...found.faqs.slice(0, 2).map((f) => ({ kind: 'faq' as const, id: f.id })),
          ...found.lessons.slice(0, 2).map((l) => ({ kind: 'lesson' as const, id: l.id })),
        ]
        const helper: Answer = {
          id: uid('a'),
          author: '골목 도우미',
          role: 'helper',
          body: links.length
            ? '질문과 관련된 자료를 찾았어요. 아래 내용을 먼저 확인해 보세요.'
            : '바로 연결할 자료를 찾지 못했어요. 급하다면 아래 상담 창구(1357 · 126 · 1350)를 이용해 보세요.',
          createdAt: now,
          helpful: 0,
          links,
        }
        const q: Question = {
          id,
          category,
          title,
          body,
          author: p.shopName || `${p.name} 사장님`,
          bizLabel: '',
          createdAt: now,
          likes: 0,
          mine: true,
          answers: [helper],
        }
        set({ questions: [q, ...get().questions] })
        return id
      },
      toggleLike: (questionId) =>
        set({
          questions: get().questions.map((q) =>
            q.id === questionId ? { ...q, liked: !q.liked, likes: q.likes + (q.liked ? -1 : 1) } : q,
          ),
        }),
      addAnswer: (questionId, body) => {
        const p = get().profile
        const a: Answer = {
          id: uid('a'),
          author: p.shopName || `${p.name} 사장님`,
          role: 'me',
          body,
          createdAt: new Date().toISOString(),
          helpful: 0,
        }
        set({ questions: get().questions.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, a] } : q)) })
      },
      toggleHelpful: (questionId, answerId) =>
        set({
          questions: get().questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: q.answers.map((a) =>
                    a.id === answerId
                      ? { ...a, markedHelpful: !a.markedHelpful, helpful: a.helpful + (a.markedHelpful ? -1 : 1) }
                      : a,
                  ),
                }
              : q,
          ),
        }),
      deleteQuestion: (questionId) => set({ questions: get().questions.filter((q) => q.id !== questionId) }),

      markRead: (ids) => set({ readNotifs: Array.from(new Set([...get().readNotifs, ...ids])).slice(-300) }),
      resetAll: () => set(initial()),

      toggleTask: (date, key) => {
        const cur = get().taskDone[date] ?? []
        const turningOn = !cur.includes(key)
        const next = turningOn ? [...cur, key] : cur.filter((k) => k !== key)
        let challengeLog = get().challengeLog
        // 도전에서 만든 할 일이면 도전 기록도 함께
        if (key.startsWith('todo:')) {
          const todo = get().quickTodos.find((t) => `todo:${t.id}` === key)
          if (todo?.challengeId) {
            const cid = todo.challengeId
            challengeLog = turningOn
              ? challengeLog.some((l) => l.id === cid && l.date === date)
                ? challengeLog
                : [...challengeLog, { id: cid, date }]
              : challengeLog.filter((l) => !(l.id === cid && l.date === date))
          }
        }
        set({ taskDone: pruneDays({ ...get().taskDone, [date]: next }, todayKey()), challengeLog })
      },
      addTodo: ({ title, slot, date, challengeId }) => {
        const id = uid('td')
        set({ quickTodos: [...get().quickTodos, { id, title, slot, date, challengeId }] })
        return id
      },
      updateTodo: (id, patch) => set({ quickTodos: get().quickTodos.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      deleteTodo: (id) => set({ quickTodos: get().quickTodos.filter((t) => t.id !== id) }),
      setRoutineEnabled: (id, on) => {
        const biz = get().profile.bizType
        const tpl = ROUTINE_MAP[id]
        const isDefault = tpl ? defaultOn(tpl, biz) : true // 직접 만든 루틴은 기본 켜짐
        const without = (arr: string[]) => arr.filter((x) => x !== id)
        if (isDefault) set({ routineOff: on ? without(get().routineOff) : [...without(get().routineOff), id] })
        else set({ routineOn: on ? [...without(get().routineOn), id] : without(get().routineOn) })
      },
      setRoutineWeekday: (id, wd) => set({ routineWeekday: { ...get().routineWeekday, [id]: wd } }),
      addCustomRoutine: (r) => set({ customRoutines: [...get().customRoutines, { ...r, id: uid('cr'), custom: true }] }),
      deleteCustomRoutine: (id) =>
        set({ customRoutines: get().customRoutines.filter((r) => r.id !== id), routineOff: get().routineOff.filter((x) => x !== id) }),
      completeChallenge: (id, date, note) => {
        if (get().challengeLog.some((l) => l.id === id && l.date === date)) return
        set({ challengeLog: [...get().challengeLog, { id, date, note }] })
      },
      undoChallenge: (id, date) => set({ challengeLog: get().challengeLog.filter((l) => !(l.id === id && l.date === date)) }),
      shuffleChallenges: (date) =>
        set({ challengeShuffle: pruneDays({ ...get().challengeShuffle, [date]: (get().challengeShuffle[date] ?? 0) + 1 }, todayKey()) }),
    }),
    {
      name: 'golmok-app-v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>
        if (version < 2 && Array.isArray(p.events)) p.events = p.events.filter((e) => !isV1Starter(e))
        return p as AppState
      },
    },
  ),
)

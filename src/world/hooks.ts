import { useMemo } from 'react'
import { useApp } from '@/store/app'
import { useGame } from '@/game/store'
import { COURSES } from '@/data/courses'
import { useWorld, todayOf, levelOf } from './store'
import { JOB_MAP } from './jobs'
import { dailyQuests, storyFor, type QuestCtx } from './quests'

export function useQuestCtx(): QuestCtx {
  const w = useWorld()
  const g = useGame()
  const progress = useApp((s) => s.progress)
  return useMemo(() => {
    const today = todayOf(w)
    const cat = w.job ? JOB_MAP[w.job.id].category : null
    const roleLessons = cat ? COURSES.filter((c) => c.category === cat).reduce((n, c) => n + c.lessons.filter((l) => progress[l.id]?.done).length, 0) : 0
    const ranks = g.history.map((h) => h.rank)
    return {
      path: w.path,
      shopStarted: g.started,
      visited: w.visited,
      counters: w.counters,
      today: today.counts,
      jobRank: w.job?.rank ?? 0,
      hasJob: !!w.job,
      roleLessons,
      cash: w.cash,
      bestRank: ranks.length ? Math.min(...ranks) : 0,
      invested: w.invested,
      tier: g.tier,
      built: Object.fromEntries(Object.entries(w.buildings).filter(([, at]) => at === 0).map(([id]) => [id, true])),
      champion: g.hall.some((h) => h.tier === 2 && h.rank === 1),
      level: levelOf(w.exp).level,
    }
  }, [w, g, progress])
}

/** 지금 진행할 이야기 퀘스트 */
export function useStory() {
  const ctx = useQuestCtx()
  const w = useWorld()
  const list = storyFor(w.path, w.fromEmployee)
  const current = list.find((q) => !w.storyClaimed.includes(q.id)) ?? null
  return { current, done: current ? current.done(ctx) : false, index: current ? list.indexOf(current) : list.length, total: list.length, ctx }
}

export function useDaily() {
  const w = useWorld()
  const today = todayOf(w)
  const list = dailyQuests(today.date, w.path)
  return list.map((q) => ({ ...q, have: today.counts[q.key] ?? 0, claimed: today.claimed.includes(q.id) }))
}

import { useMemo } from 'react'
import { useApp } from '@/store/app'
import { useToday } from '@/store/selectors'
import { todayKey } from '@/lib/date'
import { realLifeBuff, skillsFromProgress } from './skills'

/** 게임 밖(배움·오늘 할 일)에서 쌓은 것이 게임에 주는 힘 */
export function useGameContext() {
  const progress = useApp((s) => s.progress)
  const logs = useApp((s) => s.logs)
  const challengeLog = useApp((s) => s.challengeLog)
  const { items } = useToday()
  const today = todayKey()
  return useMemo(() => {
    const skills = skillsFromProgress(progress)
    const done = items.filter((i) => i.done).length
    const todoRatio = items.length ? done / items.length : 0
    const challengesToday = challengeLog.filter((l) => l.date === today).length
    const lessonsToday = logs.filter((l) => l.date === today).length
    return {
      skills,
      todoRatio,
      todoDone: done,
      todoTotal: items.length,
      challengesToday,
      lessonsToday,
      buff: realLifeBuff(todoRatio, challengesToday),
      /** 정부지원 노하우 → 투자 할인 */
      discount: Math.min(0.3, 0.05 * skills.support),
    }
  }, [progress, logs, challengeLog, items, today])
}

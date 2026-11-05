import { useEffect, useRef } from 'react'
import { useApp } from '@/store/app'
import { useAllEvents } from '@/store/selectors'
import { nowMin, timeToMin, todayKey } from './date'
import { occurrencesOn } from './schedule'

/**
 * 앱이 열려 있는 동안 일정 10분 전에 알림을 띄웁니다.
 * (서버 푸시 없이 동작하는 가벼운 리마인더 — 브라우저 알림 권한이 있을 때만)
 */
export function useReminders() {
  const enabled = useApp((s) => s.settings.notify)
  const onboarded = useApp((s) => s.onboarded)
  const events = useAllEvents()
  const fired = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled || !onboarded) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const check = () => {
      const today = todayKey()
      const now = nowMin()
      for (const o of occurrencesOn(events, today)) {
        if (!o.event.start || o.done) continue
        const diff = timeToMin(o.event.start) - now
        const key = `${o.event.id}-${today}`
        if (diff >= 0 && diff <= 10 && !fired.current.has(key)) {
          fired.current.add(key)
          try {
            new Notification(`곧 ${o.event.title}`, {
              body: `${o.event.start} 시작 · 골목배움`,
              icon: './icon.svg',
              tag: key,
            })
          } catch {
            /* 일부 모바일 브라우저는 페이지 알림을 지원하지 않음 */
          }
        }
      }
    }
    check()
    const t = window.setInterval(check, 60_000)
    return () => window.clearInterval(t)
  }, [enabled, onboarded, events])
}

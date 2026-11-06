import { useCallback, useEffect, useRef, useState } from 'react'
import { emote } from './emote'
import { World, type WorldHandle } from './render/World'
import { HUD } from './ui/HUD'
import { Toasts, toast } from './ui/kit'
import { useWorld, levelOf } from './store'
import { useGame } from '@/game/store'
import { useStory } from './hooks'
import { runBusinessDay } from './actions'
import type { DayDecision, DayResult } from '@/game/types'
import type { BuildingId, HitId } from './map'
import { PanelRouter, type PanelState } from './panels/Router'
import { CreateFlow } from './CreateFlow'
import { Atmosphere } from './render/Atmosphere'

function isNight() {
  const h = new Date().getHours()
  return h >= 19 || h < 6
}

function DayTint() {
  const [h, setH] = useState(new Date().getHours() + new Date().getMinutes() / 60)
  useEffect(() => {
    const t = setInterval(() => setH(new Date().getHours() + new Date().getMinutes() / 60), 60_000)
    return () => clearInterval(t)
  }, [])
  // 아침·저녁 노을, 밤엔 푸르게
  const tint = h < 5 || h >= 21 ? 'rgba(30,40,110,0.38)' : h < 7 ? 'rgba(255,170,120,0.18)' : h >= 19.5 ? 'rgba(60,50,140,0.28)' : h >= 18 ? 'rgba(255,130,80,0.18)' : 'transparent'
  return <div className="pointer-events-none absolute inset-0 z-10 transition-colors duration-[3000ms]" style={{ background: tint, mixBlendMode: 'multiply' }} />
}

/** 영업 연출 — 손님이 몰려오는 동안 잠깐 */
function RunOverlay({ result, onDone }: { result: DayResult; onDone: () => void }) {
  const g = useGame()
  const [t, setT] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / 3200)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 250)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])
  const hours = Math.floor(10 + t * 11)
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-40 flex justify-center" onClick={onDone}>
      <div className="flex w-[min(30rem,92%)] animate-pop items-center gap-3 rounded-3xl border-[3px] border-[#1B1D45]/80 bg-white/95 p-2.5 shadow-2xl backdrop-blur">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-[1.75rem]" style={{ background: `${g.color}22` }}>
          {g.shopEmoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between">
            <span className="text-[0.9375rem] font-black">🔔 {g.shopName} 영업 중</span>
            <span className="text-[0.75rem] font-black tabular-nums text-sub">{String(hours).padStart(2, '0')}:00</span>
          </span>
          <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-black/10">
            <span className="block h-full rounded-full bg-gradient-to-r from-[#5FCB6D] to-[#2E9C6A]" style={{ width: `${t * 100}%` }} />
          </span>
          <span className="mt-0.5 flex justify-between text-[0.6875rem] font-bold text-sub">
            <span>손님 {Math.round(result.customers * t)}명</span>
            <span>매출 {Math.round(result.revenue * t).toLocaleString()}원</span>
          </span>
        </span>
        <span className="text-[0.625rem] font-bold text-mute">탭해서 건너뛰기</span>
      </div>
    </div>
  )
}

export function GameScreen() {
  const worldRef = useRef<WorldHandle>(null)
  const [panel, setPanel] = useState<PanelState | null>(null)
  const [running, setRunning] = useState<DayResult | null>(null)
  const created = useWorld((s) => s.created)
  const story = useStory()
  const settle = useWorld((s) => s.settleInterest)

  useEffect(() => {
    if (!created) return
    const interest = settle()
    if (interest > 0) toast(`대출 이자 ${interest.toLocaleString()}원이 나갔어요`, 'info')
  }, [settle, created])

  const onArrive = useCallback((hit: HitId) => {
    if (!hit.startsWith('plot:') && !hit.startsWith('rival:')) useWorld.getState().visit(hit)
    setPanel({ hit })
  }, [])

  const goTarget = useCallback((t: BuildingId | 'farm') => {
    if (t === 'farm') {
      // 비어 있거나 다 자란 밭으로
      const w = useWorld.getState()
      const lv = levelOf(w.exp).level
      const ready = Object.entries(w.plots).find(([, p]) => p.readyAt && p.readyAt <= Date.now())?.[0]
      const empty = ['f0', 'f1', 'f2', 'r0'].find((id) => !w.plots[id]?.crop)
      worldRef.current?.walkTo(`plot:${ready ?? (lv >= 1 ? empty : undefined) ?? 'f0'}`)
    } else worldRef.current?.walkTo(t)
  }, [])

  const claimStory = () => {
    const q = story.current
    if (!q || !story.done) return
    useWorld.getState().claimStory(q.id, q.reward)
    toast(`퀘스트 완료! +${q.reward.cash.toLocaleString()}원 · +${q.reward.exp} EXP`)
    emote('hop', '🎁')
  }

  const runDay = useCallback((d: DayDecision) => {
    const result = runBusinessDay(d)
    setPanel(null)
    setRunning(result)
    worldRef.current?.rush(Math.min(7, Math.max(3, Math.round(result.customers / 25))))
  }, [])
  const finishRun = useCallback(() => {
    setRunning((r) => {
      if (r) {
        setPanel({ hit: 'result', result: r })
        emote(r.profit >= 0 ? 'cheer' : 'nod', r.profit >= 0 ? '💰' : '😅')
      }
      return null
    })
  }, [])

  // 레벨업 알림
  const exp = useWorld((s) => s.exp)
  const prevLevel = useRef<number | null>(null)
  useEffect(() => {
    const lv = levelOf(exp).level
    if (prevLevel.current !== null && lv > prevLevel.current) {
      toast(`🎉 레벨 ${lv} 달성! 체력이 가득 찼어요`, 'level')
      emote('cheer', '⭐')
    }
    prevLevel.current = lv
  }, [exp])

  return (
    <>
      <World ref={worldRef} onArrive={onArrive} target={created && story.current && !story.done ? (story.current.target as BuildingId | 'farm') : null} paused={!!panel || !created || !!running} />
      <Atmosphere night={isNight()} />
      <DayTint />
      {created ? (
        <>
          {!running && (
            <HUD
              onMenu={(m) => setPanel({ hit: m })}
              onGo={() => story.current && goTarget(story.current.target)}
              onClaimStory={claimStory}
              onZoom={(d) => worldRef.current?.zoom(d)}
              onRecenter={() => worldRef.current?.recenter()}
            />
          )}
          {running && <RunOverlay result={running} onDone={finishRun} />}
          {panel && <PanelRouter panel={panel} onClose={() => setPanel(null)} open={setPanel} world={worldRef} onRunDay={runDay} goTarget={goTarget} />}
        </>
      ) : (
        <CreateFlow />
      )}
      <Toasts />
    </>
  )
}

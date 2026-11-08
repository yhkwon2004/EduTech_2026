import { useCallback, useEffect, useRef, useState } from 'react'
import { emote } from './emote'
import { World, type WorldHandle } from './render/World'
import { HUD } from './ui/HUD'
import { GameButton, Toasts, toast } from './ui/kit'
import { useWorld, levelOf } from './store'
import { useGame } from '@/game/store'
import { useStory } from './hooks'
import { runBusinessDay } from './actions'
import type { DayDecision, DayResult } from '@/game/types'
import type { BuildingId, HitId } from './map'
import { PanelRouter, type PanelState } from './panels/Router'
import { CreateFlow } from './CreateFlow'
import { Atmosphere } from './render/Atmosphere'
import { FxLayer, fxConfetti } from './fx'
import { installAudioUnlock, setAudio, sfx } from './audio'
import { useApp } from '@/store/app'
import { BUILD_MAP } from './map'
import { useCompany } from './companyStore'

installAudioUnlock()

/** 처음 마을에 들어오면 보여 주는 조작 도움말 */
function HelpOverlay({ onDone }: { onDone: () => void }) {
  const tips = [
    ['👆', '건물을 누르면 걸어가서 들어가요'],
    ['🧭', '아래 바로가기 바로 지은 건물에 바로 가요'],
    ['🤏', '두 손가락 · 휠 · +/- 로 확대/축소, 끌어서 이동'],
    ['📜', '왼쪽 아래 이야기 퀘스트의 "가기"를 따라가면 돼요'],
    ['🏫', '배움터에서 3분 스테이지를 깨면 건물을 지을 수 있어요'],
    ['❓', '마을 사람 머리 위 ❓는 OX 퀴즈예요'],
  ]
  return (
    <div className="absolute inset-0 z-[45] grid place-items-center bg-[#101233]/55 p-3 backdrop-blur-[2px]" onClick={onDone}>
      <div className="w-full max-w-[34rem] animate-pop rounded-[1.5rem] border-[3px] border-[#1B1D45]/80 bg-[#FFFDF7] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[1rem] font-black">🗺️ 이렇게 놀아요</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {tips.map(([e, t]) => (
            <li key={t} className="flex items-center gap-2 rounded-xl bg-black/5 px-2.5 py-1.5 text-[0.8125rem] font-bold">
              <span className="text-[1.25rem]">{e}</span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-end">
          <GameButton tone="sun" onClick={onDone}>
            시작할게요!
          </GameButton>
        </div>
      </div>
    </div>
  )
}

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
  const tint = h < 5 || h >= 21 ? 'rgba(16,22,84,0.62)' : h < 7 ? 'rgba(255,170,120,0.2)' : h >= 19.5 ? 'rgba(40,36,126,0.5)' : h >= 18 ? 'rgba(255,130,80,0.22)' : 'transparent'
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
  const helpSeen = useApp((s) => !!s.settings.helpSeen)
  const lowFx = useApp((s) => !!s.settings.lowFx)
  const bgmOn = useApp((s) => s.settings.bgm !== false)
  const sfxOn = useApp((s) => s.settings.sfx !== false)
  useEffect(() => setAudio({ bgm: bgmOn, sfx: sfxOn }), [bgmOn, sfxOn])

  useEffect(() => {
    if (!created) return
    const interest = settle()
    if (interest > 0) toast(`대출 이자 ${interest.toLocaleString()}원이 나갔어요`, 'info')
  }, [settle, created])
  // 공장 직원: 월급 정산 + 자동 작업 (몇 초마다)
  useEffect(() => {
    if (!created) return
    const run = () => {
      if (useWorld.getState().buildings.factory !== 0) return
      const c = useCompany.getState()
      const paid = c.settleDay()
      if (paid > 0) toast(`💼 직원 월급 ${paid.toLocaleString()}원을 지급했어요`, 'info')
      const acts = c.tick()
      if (acts.length) toast(acts[acts.length - 1], 'info')
    }
    run()
    const t = window.setInterval(run, 6000)
    return () => window.clearInterval(t)
  }, [created])

  const onArrive = useCallback((hit: HitId) => {
    if (!hit.startsWith('plot:') && !hit.startsWith('rival:') && !hit.startsWith('npc:')) useWorld.getState().visit(hit)
    sfx('open')
    // 아직 안 지은 건물이면 건설 창
    if (BUILD_MAP[hit as keyof typeof BUILD_MAP] && useWorld.getState().buildings[hit] !== 0) {
      setPanel({ hit: 'build', sub: hit })
      return
    }
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
    sfx('chest')
    fxConfetti()
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
      sfx('levelup')
      fxConfetti()
    }
    prevLevel.current = lv
  }, [exp])

  return (
    <>
      <World ref={worldRef} onArrive={onArrive} target={created && story.current && !story.done ? (story.current.target as BuildingId | 'farm') : null} paused={!!panel || !created || !!running} />
      <Atmosphere night={isNight()} low={lowFx} />
      <DayTint />
      {created ? (
        <>
          {!running && (
            <HUD
              onMenu={(m) => {
                sfx('open')
                setPanel({ hit: m })
              }}
              onGo={() => story.current && goTarget(story.current.target)}
              onGoTo={(t) => {
                sfx('tap')
                goTarget(t)
              }}
              onClaimStory={claimStory}
              onZoom={(d) => worldRef.current?.zoom(d)}
              onRecenter={() => worldRef.current?.recenter()}
            />
          )}
          {running && <RunOverlay result={running} onDone={finishRun} />}
          {!helpSeen && !panel && !running && <HelpOverlay onDone={() => useApp.getState().updateSettings({ helpSeen: true })} />}
          {panel && <PanelRouter panel={panel} onClose={() => setPanel(null)} open={setPanel} world={worldRef} onRunDay={runDay} goTarget={goTarget} />}
        </>
      ) : (
        <CreateFlow />
      )}
      <FxLayer />
      <Toasts />
    </>
  )
}

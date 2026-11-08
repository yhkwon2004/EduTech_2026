import { useEffect, useMemo, useRef, useState } from 'react'
import { fxAt } from '../fx'
import { sfx } from '../audio'
import { toLook } from '../avatar'
import { Backpack, ChevronDown, ChevronUp, Crown, Footprints, Gift, LocateFixed, Minus, Plus, ScrollText, Settings, Zap } from 'lucide-react'
import { BUILDINGS, type BuildingId } from '../map'
import { useCompany } from '../companyStore'
import { useWorld, energyNow, levelOf, maxEnergy } from '../store'
import { useGame, canPlayToday } from '@/game/store'
import { useDaily, useStory } from '../hooks'
import { CharacterArt } from '../render/Character'
import { JOB_MAP, RANKS } from '../jobs'
import { LEAGUE_NAME, SEASON_DAYS } from '@/game/data'
import { hash, rng } from '@/lib/rng'
import { formatKo, todayKey } from '@/lib/date'
import { cx, mmss, won } from './kit'

function weatherToday(date: string) {
  const r = rng(hash(`wx:${date}`))()
  const month = Number(date.slice(5, 7))
  const base = [0, -2, 1, 7, 13, 18, 23, 26, 26, 21, 14, 7, 1][month]
  const temp = Math.round(base + (r - 0.5) * 6)
  const icon = r < 0.4 ? '☀️' : r < 0.65 ? '⛅' : r < 0.85 ? '🌧️' : '☁️'
  return { icon, temp }
}

export function Avatar({ size = 44 }: { size?: number }) {
  const w = useWorld()
  const look = useMemo(() => toLook(w.avatar, w.path === 'employee' ? 'employee' : 'owner'), [w.avatar, w.path])
  return (
    <svg width={size} height={size} viewBox="-18 -57 36 36" className="shrink-0 rounded-full bg-gradient-to-b from-[#BDE8FF] to-[#8FD0F5]">
      <CharacterArt look={look} part="head" yaw={30} />
    </svg>
  )
}

/** 숫자가 부드럽게 올라가요 */
function useTween(value: number, ms = 650) {
  const [v, setV] = useState(value)
  const shown = useRef(value)
  useEffect(() => {
    const a = shown.current
    if (a === value) return
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms)
      const n = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)))
      shown.current = n
      setV(n)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return v
}

/** 값이 바뀌면 떠오르는 글자 */
function useGainFx(value: number, el: React.RefObject<HTMLElement | null>, fmt: (d: number) => string, color: string, onUp?: () => void) {
  const prev = useRef(value)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    const d = value - prev.current
    prev.current = value
    if (!d) return
    setBump((b) => b + 1)
    fxAt(el.current, { float: fmt(d), color: d > 0 ? color : '#FF9C94' })
    if (d > 0) onUp?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return bump
}

const NAV_ICON: Record<BuildingId, string> = { shop: '🏪', workshop: '🍳', market: '🛒', academy: '🏫', company: '🏢', support: '🏛️', board: '📋', tree: '🌳', factory: '🏭' }
const NAV_ORDER: (BuildingId | 'farm')[] = ['shop', 'workshop', 'market', 'farm', 'academy', 'tree', 'factory', 'company', 'support', 'board']

/** 아래 가운데: 바로가기 (지은 건물만) */
function QuickNav({ onGo, now, left }: { onGo: (t: BuildingId | 'farm') => void; now: number; left: string }) {
  const buildings = useWorld((s) => s.buildings)
  const crafting = useWorld((s) => s.crafting)
  const plots = useWorld((s) => s.plots)
  const fast = useWorld((s) => s.fast)
  const job = useWorld((s) => s.job)
  const g = useGame()
  const jobs = useCompany((s) => s.jobs)
  const badge = (id: BuildingId | 'farm') => {
    if (id === 'workshop') return crafting.some((c) => c.readyAt <= now)
    if (id === 'farm') return Object.values(plots).some((p) => p.readyAt && p.readyAt <= now)
    if (id === 'shop') return g.started && (canPlayToday(g) || fast)
    if (id === 'company') return !!job && (job.lastWork !== todayKey() || fast)
    if (id === 'factory') return jobs.some((j) => j && j.readyAt <= now)
    return false
  }
  const list = NAV_ORDER.filter((id) => id === 'farm' || buildings[id] === 0)
  return (
    <div className="pointer-events-none absolute bottom-2 right-[9.75rem] z-30 flex justify-center transition-[left] duration-300" style={{ left }}>
      <div className="no-scrollbar pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-2xl border-2 border-[#1B1D45]/70 bg-white/92 p-1 shadow-lg backdrop-blur">
        {list.map((id) => {
          const name = id === 'farm' ? '텃밭' : BUILDINGS.find((b) => b.id === id)!.name
          const on = badge(id)
          return (
            <button
              key={id}
              onClick={() => onGo(id)}
              aria-label={`${name}으로 가기`}
              title={name}
              className={cx(
                'relative grid size-9 shrink-0 place-items-center rounded-xl text-[1.125rem] transition active:scale-90',
                on ? 'bg-gradient-to-b from-[#FFF09A] to-[#FFC93C] ring-2 ring-[#F2A21B]/60' : 'bg-black/5 hover:bg-black/10',
              )}
            >
              {id === 'farm' ? '🌱' : NAV_ICON[id]}
              {on && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-coral ring-2 ring-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function HUD({
  onMenu,
  onGo,
  onGoTo,
  onClaimStory,
  onZoom,
  onRecenter,
}: {
  onMenu: (m: 'bag' | 'quest' | 'rank' | 'settings' | 'character') => void
  onGo: () => void
  onGoTo: (t: BuildingId | 'farm') => void
  onClaimStory: () => void
  onZoom: (d: number) => void
  onRecenter: () => void
}) {
  const [questOpen, setQuestOpen] = useState(true)
  const w = useWorld()
  const g = useGame()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const lv = levelOf(w.exp)
  const en = energyNow(w, now)
  const max = maxEnergy(lv.level)
  const story = useStory()
  const daily = useDaily()
  const dailyReady = daily.filter((d) => !d.claimed && d.have >= d.need).length
  const date = todayKey()
  const wx = weatherToday(date)
  const time = new Date(now).toTimeString().slice(0, 5)
  const title = w.job ? `${JOB_MAP[w.job.id].name} ${RANKS[w.job.rank].name}` : g.started ? `${g.shopName} 사장님` : w.path === 'owner' ? '예비 사장님' : '취업 준비생'
  const lastRank = g.history[g.history.length - 1]?.rank
  const coinEl = useRef<HTMLSpanElement>(null)
  const expEl = useRef<HTMLDivElement>(null)
  const cashShown = useTween(w.cash)
  const coinBump = useGainFx(
    w.cash,
    coinEl,
    (d) => `${d > 0 ? '+' : '-'}${won(Math.abs(d))}원`,
    '#FFE27A',
    () => {
      sfx('coin')
      fxAt(coinEl.current, 'burst', { emoji: '🪙', n: 6 })
    },
  )
  useGainFx(w.exp, expEl, (d) => `${d > 0 ? '+' : ''}${d} EXP`, '#B9F27A')

  return (
    <>
      {/* 왼쪽 위: 내 정보 */}
      <button
        onClick={() => onMenu('character')}
        aria-label="내 캐릭터"
        className="pointer-events-auto absolute left-2 top-2 z-30 flex items-center gap-2 rounded-2xl border-2 border-[#1B1D45]/70 bg-white/92 py-1.5 pl-1.5 pr-3 text-left shadow-lg backdrop-blur transition active:scale-[0.98]"
      >
        <div className="relative">
          <Avatar />
          <span className="absolute -bottom-1 -left-1 rounded-full border-2 border-white bg-ink px-1.5 text-[0.625rem] font-black text-white">Lv.{lv.level}</span>
        </div>
        <div className="w-[8.5rem] min-w-0">
          <p className="truncate text-[0.8125rem] font-black leading-tight">{w.name}</p>
          <p className="truncate text-[0.625rem] font-bold leading-tight text-sub">{title}</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="w-7 text-[0.625rem] font-black text-[#B7860B]">EXP</span>
            <div ref={expEl} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FFE27A] to-sun transition-[width] duration-700" style={{ width: `${lv.progress * 100}%` }} />
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <Zap className="size-3 shrink-0 text-coral" fill="currentColor" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-coral" style={{ width: `${(en.energy / max) * 100}%` }} />
            </div>
            <span className="text-[0.625rem] font-black tabular-nums text-coral">
              {en.energy}/{max}
            </span>
          </div>
          {en.nextIn > 0 && <p className="text-[0.625rem] font-bold text-mute">+1 체력 {mmss(en.nextIn)}</p>}
        </div>
      </button>

      {/* 가운데 위: 날짜·날씨 */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border-2 border-[#1B1D45]/70 bg-gradient-to-b from-[#FFF8E1] to-[#FCEBC2] px-3 py-1.5 shadow-lg">
        <span className="float-soft text-[1.375rem] leading-none">
          {new Date(now).getHours() >= 19 || new Date(now).getHours() < 6 ? (wx.icon === '☀️' ? '🌙' : wx.icon === '⛅' ? '☁️' : wx.icon) : wx.icon}
        </span>
        <span className="leading-tight">
          <span className="block text-[0.75rem] font-black">{formatKo(date)}</span>
          <span className="block text-[0.625rem] font-bold text-sub">
            {time} · {wx.temp}°C{g.started ? ` · 시즌 ${g.season} ${g.dayInSeason}/${SEASON_DAYS}일` : ''}
          </span>
        </span>
      </div>

      {/* 오른쪽 위: 돈·순위 */}
      <div className="pointer-events-auto absolute right-2 top-2 z-30 flex items-center gap-1.5">
        {g.started && (
          <button onClick={() => onMenu('rank')} className="flex h-9 items-center gap-1 rounded-full border-2 border-[#1B1D45]/70 bg-white/92 px-2.5 text-[0.75rem] font-black shadow-lg">
            <Crown className="size-4 text-[#B7860B]" fill="currentColor" />
            {lastRank ? `${lastRank}위` : '-'}
            <span className="hidden text-[0.625rem] font-bold text-sub sm:inline">· {LEAGUE_NAME(g.tier, g.region)}</span>
          </button>
        )}
        <span
          ref={coinEl}
          key={coinBump}
          className={cx(
            'shine-sweep flex h-9 items-center gap-1 rounded-full border-2 border-[#1B1D45]/70 bg-gradient-to-b from-[#FFE58A] to-sun px-3 text-[0.875rem] font-black tabular-nums text-ink shadow-lg',
            coinBump > 0 && 'count-bump',
          )}
        >
          🪙 {won(cashShown)}
        </span>
      </div>

      {/* 오른쪽: 메뉴 */}
      <div className="pointer-events-auto absolute right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
        {(
          [
            ['bag', '가방', Backpack, 0],
            ['quest', '퀘스트', ScrollText, dailyReady + (story.done ? 1 : 0)],
            ['rank', '랭킹', Crown, 0],
            ['settings', '설정', Settings, 0],
          ] as const
        ).map(([id, label, I, badge]) => (
          <button
            key={id}
            onClick={() => onMenu(id)}
            className="btn-game relative grid size-12 place-items-center rounded-2xl border-b-[3px] border-[#C98B4F] bg-gradient-to-b from-[#FFF7EA] to-[#F3DEC0]"
            aria-label={label}
          >
            <I className="size-5 text-wood" strokeWidth={2.4} />
            <span className="text-[0.625rem] font-black text-wood">{label}</span>
            {badge > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-white bg-coral text-[0.625rem] font-black text-white">{badge}</span>}
          </button>
        ))}
      </div>

      {/* 아래 가운데: 바로가기 */}
      <QuickNav onGo={onGoTo} now={now} left={story.current ? (questOpen ? '20rem' : '9rem') : '0.5rem'} />

      {/* 왼쪽 아래: 퀘스트 안내 (접을 수 있어요) */}
      {story.current && (
        <div
          className={cx(
            'pointer-events-auto absolute bottom-2 left-2 z-30 flex items-center gap-2 rounded-2xl border-2 border-[#1B1D45]/70 bg-white/94 p-1.5 pr-2 shadow-lg backdrop-blur',
            questOpen ? 'max-w-[19rem]' : 'max-w-[8rem]',
          )}
        >
          <button
            onClick={() => setQuestOpen((v) => !v)}
            aria-label={questOpen ? '퀘스트 접기' : '퀘스트 펼치기'}
            className={cx('relative grid size-10 shrink-0 place-items-center rounded-xl text-[1.125rem] font-black', story.done ? 'bg-teal text-white' : 'bg-sun text-ink')}
          >
            {story.done ? '✓' : '!'}
            <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-white text-ink shadow">
              {questOpen ? <ChevronDown className="size-3" strokeWidth={3} /> : <ChevronUp className="size-3" strokeWidth={3} />}
            </span>
          </button>
          {questOpen && (
            <span className="min-w-0 flex-1">
              <span className="block text-[0.625rem] font-black text-sub">
                이야기 {story.index + 1}/{story.total}
              </span>
              <span className="block truncate text-[0.8125rem] font-black leading-tight">{story.current.title}</span>
              <span className="block truncate text-[0.625rem] font-semibold text-sub">{story.current.hint}</span>
            </span>
          )}
          {story.done ? (
            <button
              onClick={onClaimStory}
              className="btn-game flex h-9 shrink-0 items-center gap-1 rounded-xl border-b-[3px] border-[#2D7F39] bg-gradient-to-b from-[#5FCB6D] to-leaf px-3 text-[0.75rem] font-black text-white"
            >
              <Gift className="size-4" /> 받기
            </button>
          ) : (
            <button
              onClick={onGo}
              className="btn-game flex h-9 shrink-0 items-center gap-1 rounded-xl border-b-[3px] border-primary-700 bg-gradient-to-b from-[#4C94FF] to-primary px-3 text-[0.75rem] font-black text-white"
            >
              <Footprints className="size-4" /> 가기
            </button>
          )}
        </div>
      )}

      {/* 오른쪽 아래: 확대/축소 */}
      <div className="pointer-events-auto absolute bottom-2 right-2 z-30 flex gap-1.5">
        {[
          [Minus, () => onZoom(-0.15), '축소'],
          [Plus, () => onZoom(0.15), '확대'],
          [LocateFixed, onRecenter, '내 위치'],
        ].map(([I, fn, label], i) => {
          const Icon = I as typeof Minus
          return (
            <button key={i} aria-label={label as string} onClick={fn as () => void} className="btn-game grid size-9 place-items-center rounded-xl border-b-[3px] border-[#1B1D45] bg-white/94">
              <Icon className="size-4.5" strokeWidth={2.6} />
            </button>
          )
        })}
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Check, FlaskConical, Hammer, Lock, Truck } from 'lucide-react'
import { useWorld } from '../store'
import { useCompany, openOrders } from '../companyStore'
import {
  CHANNELS,
  CHANNEL_MAP,
  EXPANSIONS,
  LEVEL_PERKS,
  MAX_LEVEL,
  PRODUCTS,
  PRODUCT_MAP,
  RESEARCH,
  companyLevel,
  labSlots,
  openChannels,
  priceMul,
  productionMs,
  researchState,
  speedMul,
  supplyMul,
  unitPrice,
  unlockedProducts,
  warehouseCap,
  type FoodProduct,
} from '../company'
import { itemInfo } from '../items'
import { todayKey } from '@/lib/date'
import { sfx } from '../audio'
import { fxAt, fxConfetti } from '../fx'
import { emote } from '../emote'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, mmss, toast, won } from '../ui/kit'
import { useNow } from './FarmPanel'
import { BoardroomTab, StaffTab } from './Boardroom'
import { CHANNEL_MIN_QUALITY, qualityStars, salesMul, marketingMul } from '../company'
import { openEvent } from '../companyStore'

type Tab = 'produce' | 'research' | 'expand' | 'sell' | 'staff' | 'board' | 'company'

function LevelBadge() {
  const xp = useCompany((s) => s.xp)
  const lv = companyLevel(xp)
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/20 px-2 py-0.5 text-[0.6875rem] font-black text-white" title={`${xp}/${lv.next} XP`}>
      <span className="rounded-full bg-[#FFE27A] px-1.5 text-ink">Lv.{lv.level}</span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/25">
        <span className="block h-full rounded-full bg-[#FFE27A] transition-[width] duration-700" style={{ width: `${lv.progress * 100}%` }} />
      </span>
      <span className="hidden tabular-nums lg:inline">
        {xp}/{lv.next} XP
      </span>
    </span>
  )
}

/* ───────── 생산 ───────── */
function ProduceTab({ goMarket }: { goMarket: () => void }) {
  const c = useCompany()
  const w = useWorld()
  const now = useNow(500)
  const [line, setLine] = useState(0)
  const products = unlockedProducts(c.done)
  const cap = warehouseCap(c.done)
  const stockTotal = Object.values(c.stock).reduce((a, b) => a + b, 0)
  const supply = supplyMul(c.done)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const prodRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const emptyLine = c.jobs.findIndex((j, i) => i < c.lines && !j)
  useEffect(() => {
    if (c.jobs[line] && emptyLine >= 0) setLine(emptyLine)
  }, [c.jobs, line, emptyLine])

  const start = (p: FoodProduct, el: HTMLElement | null) => {
    const idx = !c.jobs[line] ? line : emptyLine
    if (idx < 0) return toast('모든 라인이 돌아가는 중이에요', 'info')
    const r = c.startLine(idx, p.id)
    if (r === 'ok') {
      sfx('plant')
      fxAt(el, 'burst', { emoji: p.emoji, n: 8 })
      emote('work', '🏭')
      toast(`${p.emoji} ${p.name} 생산 시작 · ${idx + 1}호 라인`)
    } else if (r === 'items') toast('원료가 모자라요', 'bad')
    else if (r === 'full') toast(`창고가 가득 찼어요 (${cap}개). 납품하거나 창고를 연구해요`, 'bad')
  }
  const collect = (i: number) => {
    const j = c.jobs[i]
    const n = c.collectLine(i)
    if (!n || !j) return
    sfx('harvest')
    fxAt(lineRefs.current[i], { float: `+${n} ${PRODUCT_MAP[j.productId].emoji}`, color: '#FFE27A' }, { big: true })
    fxAt(lineRefs.current[i], 'burst', { n: 10 })
    emote('cheer', PRODUCT_MAP[j.productId].emoji)
  }

  return (
    <div className="grid h-full gap-3 md:grid-cols-[15rem_1fr]">
      <div className="flex min-h-0 flex-col gap-1.5">
        <p className="flex items-center justify-between text-[0.75rem] font-black">
          <span>🏭 생산 라인 {c.lines}개</span>
          <span className="text-[0.625rem] text-sub">속도 ×{speedMul(c.done).toFixed(1)}</span>
        </p>
        {Array.from({ length: c.lines }, (_, i) => {
          const j = c.jobs[i]
          const p = j ? PRODUCT_MAP[j.productId] : null
          const done = !!j && j.readyAt <= now
          const prog = j ? Math.min(1, (now - j.startedAt) / (j.readyAt - j.startedAt)) : 0
          return (
            <div
              key={i}
              ref={(el) => void (lineRefs.current[i] = el)}
              onClick={() => !j && setLine(i)}
              className={cx('rounded-2xl border-2 p-2 transition', j ? 'border-black/5 bg-white' : line === i ? 'border-primary bg-primary-50' : 'border-dashed border-black/15 bg-white/60')}
            >
              <p className="flex items-center gap-1.5 text-[0.75rem] font-black">
                <span className="grid size-6 place-items-center rounded-lg bg-ink text-[0.625rem] text-white">{i + 1}</span>
                {p ? (
                  <>
                    <span className="text-[1rem]">{p.emoji}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-[0.625rem] text-sub">×{j!.qty}</span>
                  </>
                ) : (
                  <span className="flex-1 text-sub">{line === i ? '오른쪽에서 제품을 고르세요' : '빈 라인'}</span>
                )}
              </p>
              {j && !done && (
                <>
                  <Bar value={prog} color="bg-gradient-to-r from-[#9B87FF] to-violet" className="mt-1.5" />
                  <p className="mt-0.5 text-[0.625rem] font-bold text-sub">{mmss(j.readyAt - now)} 남음</p>
                </>
              )}
              {done && (
                <GameButton size="sm" tone="sun" className="mt-1.5 w-full chest-shake" onClick={() => collect(i)}>
                  📦 꺼내기 (+{j!.qty})
                </GameButton>
              )}
            </div>
          )
        })}
        <div className="mt-auto rounded-2xl bg-black/5 p-2">
          <p className="flex items-center justify-between text-[0.6875rem] font-black">
            <span>📦 완제품 창고</span>
            <span className={cx(stockTotal >= cap && 'text-coral')}>
              {stockTotal}/{cap}
            </span>
          </p>
          <Bar value={stockTotal / cap} color={stockTotal >= cap ? 'bg-coral' : 'bg-teal'} className="mt-1" />
        </div>
      </div>

      <div className="thin-scroll grid min-h-0 content-start gap-1.5 overflow-y-auto sm:grid-cols-2">
        {PRODUCTS.map((p) => {
          const open = products.includes(p)
          const ok = open && p.inputs.every((i) => (w.inventory[i.id] ?? 0) >= i.qty)
          const missing = p.inputs.filter((i) => (w.inventory[i.id] ?? 0) < i.qty)
          return (
            <Card key={p.id} className={cx('flex flex-col gap-1 p-2', !open && 'opacity-60')}>
              <div className="flex items-center gap-2">
                <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl bg-[#F1EEFF] text-[1.375rem]', !open && 'grayscale')}>{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[0.8125rem] font-black">
                    {p.name}
                    {!open && <Lock className="size-3 text-mute" />}
                  </span>
                  <span className="block text-[0.625rem] font-bold text-sub">
                    {p.batch}개 · {mmss(productionMs(p, c.done, w.fast))} · 개당 {unitPrice(p, c.done).toLocaleString()}원
                  </span>
                </span>
                {open ? (
                  <span ref={(el) => void (prodRefs.current[p.id] = el)}>
                    <GameButton size="sm" tone={ok ? 'violet' : 'white'} disabled={!ok} onClick={() => start(p, prodRefs.current[p.id])}>
                      ▶ 생산
                    </GameButton>
                  </span>
                ) : (
                  <Chip tone="violet">🔬 {RESEARCH.find((r) => r.id === p.research)?.name}</Chip>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {p.inputs.map((i) => {
                  const have = w.inventory[i.id] ?? 0
                  const info = itemInfo(i.id)
                  return (
                    <span key={i.id} className={cx('rounded-full px-1.5 py-0.5 text-[0.625rem] font-black', have >= i.qty ? 'bg-teal-50 text-teal' : 'bg-coral-50 text-coral')}>
                      {info.emoji} {have}/{i.qty}
                    </span>
                  )
                })}
                {open && missing.length > 0 && (
                  <button
                    onClick={() => {
                      if (!supply) return goMarket()
                      for (const i of missing) {
                        const need = i.qty - (w.inventory[i.id] ?? 0)
                        if (!itemInfo(i.id).price || !c.buySupply(i.id, need)) {
                          toast(`${itemInfo(i.id).name}은(는) 텃밭에서 키우거나 돈이 모자라요`, 'bad')
                          return
                        }
                      }
                      sfx('coin')
                      toast('🚚 원료가 도착했어요')
                    }}
                    className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[0.625rem] font-black text-primary"
                  >
                    {supply ? `🚚 원료 사기 (시세×${supply})` : '🛒 도매시장 가기'}
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 연구개발 ───────── */
function ResearchTab() {
  const c = useCompany()
  const cash = useWorld((s) => s.cash)
  const fast = useWorld((s) => s.fast)
  const now = useNow(500)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const start = (id: string) => {
    if (!c.startResearch(id)) return toast('돈이 모자라요', 'bad')
    sfx('open')
    emote('nod', '🔬')
    fxAt(refs.current[id], 'ring', { color: '#9B87FF' })
  }
  const collect = (id: string) => {
    if (!c.collectResearch(id)) return
    sfx('unlock')
    fxConfetti()
    fxAt(refs.current[id], 'burst', { emoji: '💡', n: 10 })
    emote('cheer', '💡')
    toast(`🔬 연구 완료: ${RESEARCH.find((r) => r.id === id)?.name}`)
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F1EEFF] to-[#EEF4FF] px-3 py-1.5 text-[0.75rem] font-black">
        <FlaskConical className="size-4 text-violet" />
        연구소 {Object.keys(c.active).length}/{labSlots(c.done)} 진행 중
        <span className="ml-auto text-[0.6875rem] font-bold text-sub">
          끝낸 연구 {c.done.length}/{RESEARCH.length} · 속도 ×{speedMul(c.done).toFixed(1)} · 가격 ×{priceMul(c.done).toFixed(2)}
        </span>
      </div>
      <div className="thin-scroll grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
        {RESEARCH.map((r) => {
          const st = researchState(r, c, cash)
          const at = c.active[r.id]
          const total = (r.minutes * 60_000) / (fast ? 10 : 1)
          const finished = st.state === 'active' && at <= now
          return (
            <div
              key={r.id}
              ref={(el) => void (refs.current[r.id] = el)}
              className={cx(
                'flex flex-col gap-1 rounded-2xl border-2 p-2',
                st.state === 'done'
                  ? 'border-teal/30 bg-teal-50'
                  : st.state === 'active'
                    ? 'border-violet/40 bg-[#F6F3FF]'
                    : st.state === 'ready'
                      ? 'border-black/5 bg-white shadow-sm'
                      : 'border-black/5 bg-white/60 opacity-75',
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl text-[1.25rem]', st.state === 'done' ? 'bg-teal text-white' : 'bg-[#F1EEFF]')}>
                  {st.state === 'done' ? <Check className="size-5" strokeWidth={3} /> : r.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[0.8125rem] font-black">
                    {r.name}
                    <span className="rounded-full bg-black/5 px-1.5 text-[0.5625rem] text-sub">Lv.{r.level}</span>
                  </span>
                  <span className="block text-[0.625rem] font-semibold text-sub">{r.desc}</span>
                </span>
              </div>
              {st.state === 'active' && !finished && (
                <>
                  <Bar value={1 - (at - now) / total} color="bg-gradient-to-r from-[#9B87FF] to-violet" />
                  <p className="text-[0.625rem] font-bold text-sub">{mmss(at - now)} 남음</p>
                </>
              )}
              {finished && (
                <GameButton size="sm" tone="sun" className="chest-shake" onClick={() => collect(r.id)}>
                  💡 연구 완료 받기
                </GameButton>
              )}
              {st.state === 'ready' && (
                <GameButton size="sm" tone="violet" onClick={() => start(r.id)}>
                  🔬 연구 시작 · {won(r.cost)}원 · {fast ? `${Math.max(1, Math.round(r.minutes * 6))}초` : `${r.minutes}분`}
                </GameButton>
              )}
              {st.state === 'locked' && (
                <p className="flex flex-wrap gap-1 text-[0.625rem] font-black text-sub">
                  <Lock className="size-3" /> {st.why.join(' · ')}
                </p>
              )}
              {st.state === 'done' && <p className="text-[0.625rem] font-black text-teal">✓ 완료</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 증설 ───────── */
function ExpandTab() {
  const c = useCompany()
  const cash = useWorld((s) => s.cash)
  const lv = companyLevel(c.xp).level
  const ref = useRef<HTMLDivElement>(null)
  const expand = (id: string) => {
    if (!c.expand(id)) return toast('아직 증설할 수 없어요', 'bad')
    sfx('levelup')
    fxConfetti()
    fxAt(ref.current, 'burst', { emoji: '🏭', n: 10 })
    emote('cheer', '🏭')
    toast('🏭 라인을 늘렸어요!')
  }
  return (
    <div className="grid h-full gap-3 md:grid-cols-[1fr_1fr]">
      <div ref={ref} className="rounded-2xl bg-gradient-to-b from-[#E9ECF5] to-[#D6DBEA] p-3">
        <p className="text-[0.8125rem] font-black">🏭 공장 배치도</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={cx(
                'grid aspect-[4/5] place-items-center rounded-xl border-2 text-[1.5rem]',
                i < c.lines ? 'border-[#5B6BBF] bg-white' : 'border-dashed border-black/15 bg-white/40 grayscale',
              )}
            >
              {i < c.lines ? (c.jobs[i] ? '⚙️' : '🏭') : '➕'}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            ['🏭', `${c.lines}개`, '생산 라인'],
            ['📦', `${warehouseCap(c.done)}`, '창고 용량'],
            ['🔬', `${labSlots(c.done)}칸`, '연구소'],
          ].map(([e, v, l]) => (
            <div key={l} className="rounded-xl bg-white/90 py-1.5">
              <p className="text-[0.9375rem] font-black">
                {e} {v}
              </p>
              <p className="text-[0.5625rem] font-bold text-sub">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.625rem] font-semibold text-sub">창고·연구소는 연구개발 탭에서 넓혀요.</p>
      </div>
      <div className="space-y-1.5">
        {EXPANSIONS.map((e) => {
          const done = c.expansions.includes(e.id)
          const next = e.lines === c.lines + 1
          const can = next && lv >= e.level && cash >= e.cost
          return (
            <Card key={e.id} className={cx('flex items-center gap-2 p-2', done && 'bg-teal-50')}>
              <span className="text-[1.375rem]">{done ? '✅' : e.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-black">{e.name}</span>
                <span className="block text-[0.625rem] font-semibold text-sub">
                  {e.desc} · 회사 Lv.{e.level}
                </span>
              </span>
              {done ? (
                <Chip tone="green">완료</Chip>
              ) : (
                <GameButton size="sm" tone={can ? 'sun' : 'white'} disabled={!can} onClick={() => expand(e.id)}>
                  <Hammer className="size-3.5" /> {won(e.cost)}원
                </GameButton>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 납품 ───────── */
function SellTab() {
  const c = useCompany()
  const now = useNow(1000)
  const date = todayKey()
  const lv = companyLevel(c.xp).level
  const channels = openChannels(c.done, lv)
  const orders = openOrders(c, date)
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const fulfill = (id: string) => {
    const r = c.fulfill(id)
    if (!r) return toast('재고가 모자라요', 'bad')
    sfx('coin')
    fxAt(refs.current[id], { float: `+${r.cash.toLocaleString()}원 · +${r.xp} XP`, color: '#FFE27A' }, { big: true })
    fxAt(refs.current[id], 'burst', { emoji: '🚚', n: 8 })
    emote('cheer', '🚚')
  }
  const sell = (pid: string, qty: number, el: HTMLElement | null) => {
    const cash = c.sellDirect(pid, qty)
    if (!cash) return
    sfx('coin')
    fxAt(el, { float: `+${cash.toLocaleString()}원`, color: '#FFE27A' })
  }
  const stockIds = Object.keys(c.stock).filter((id) => c.stock[id] > 0)
  const q = qualityStars(c.done, c.staff)
  const ev = openEvent(c, date)
  void now
  return (
    <div className="grid h-full gap-3 md:grid-cols-[1fr_15rem]">
      <div className="flex min-h-0 flex-col gap-2">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {CHANNELS.filter((ch) => ch.id !== 'direct').map((ch) => {
            const open = channels.includes(ch.id)
            const r = RESEARCH.find((x) => x.effect.kind === 'channel' && x.effect.channel === ch.id)
            return (
              <span key={ch.id} className={cx('flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-[0.6875rem] font-black', open ? 'bg-ink text-white' : 'bg-black/5 text-sub')}>
                {open ? ch.emoji : <Lock className="size-3" />} {ch.name} ×{ch.mul}
                {!open && r && (
                  <span className="text-[0.5625rem] font-bold opacity-70">
                    · {r.name} + Lv.{r.level}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        <div className="thin-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {ev && (
            <div
              ref={(el) => void (refs.current[ev.id] = el)}
              className="shine-sweep relative flex items-center gap-2 rounded-2xl border-2 border-[#E8B93A] bg-gradient-to-r from-[#FFF3C4] to-[#FFE08A] p-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[1.375rem]">{ev.event.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.6875rem] font-black text-[#7A5600]">시즌 이벤트 · {ev.event.name}</span>
                <span className="block text-[0.8125rem] font-black">
                  {PRODUCT_MAP[ev.productId].emoji} {PRODUCT_MAP[ev.productId].name} {ev.qty}개 × {ev.unit.toLocaleString()}원 = {(ev.qty * ev.unit).toLocaleString()}원
                </span>
                <span className={cx('block text-[0.625rem] font-black', q >= ev.event.minQuality ? 'text-teal' : 'text-coral')}>
                  품질 {'★'.repeat(ev.event.minQuality)} 필요 (지금 {'★'.repeat(q)}) · 재고 {c.stock[ev.productId] ?? 0}/{ev.qty} · 동네 평판 +
                </span>
              </span>
              <GameButton size="sm" tone="sun" disabled={q < ev.event.minQuality || (c.stock[ev.productId] ?? 0) < ev.qty} onClick={() => fulfill(ev.id)}>
                🎁 납품
              </GameButton>
            </div>
          )}
          {orders.length === 0 && (
            <div className="grid h-full place-items-center text-center text-[0.8125rem] font-bold text-sub">
              <p>
                {channels.length <= 1 ? '🏪 편의점 유통 계약을 연구하면 납품 주문이 들어와요' : '오늘 주문을 모두 끝냈어요! 내일 새 주문이 와요'}
                <br />
                <span className="text-[0.6875rem] font-semibold text-mute">오른쪽 직판은 언제든 가능해요</span>
              </p>
            </div>
          )}
          {orders.map((o) => {
            const p = PRODUCT_MAP[o.productId]
            const ch = CHANNEL_MAP[o.channel]
            const have = c.stock[o.productId] ?? 0
            const needQ = CHANNEL_MIN_QUALITY[o.channel]
            const ok = have >= o.qty && q >= needQ
            return (
              <div key={o.id} ref={(el) => void (refs.current[o.id] = el)} className="flex items-center gap-2 rounded-2xl border-2 border-black/5 bg-white p-2 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF4D6] text-[1.375rem]">{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[0.8125rem] font-black">
                    {ch.emoji} {ch.name} · {p.name} {o.qty}개
                  </span>
                  <span className="block text-[0.625rem] font-bold text-sub">
                    개당 {o.unit.toLocaleString()}원 → 총 {(o.qty * o.unit).toLocaleString()}원 · +{o.xp} XP
                  </span>
                  <span className={cx('block text-[0.625rem] font-black', ok ? 'text-teal' : 'text-coral')}>
                    재고 {have}/{o.qty}
                    {q < needQ ? ` · 품질 ${'★'.repeat(needQ)} 필요` : q > needQ ? ' · 품질 보너스 +10%' : ''}
                    {salesMul(c.staff) > 1 ? ` · 영업팀 ×${salesMul(c.staff).toFixed(2)}` : ''}
                  </span>
                </span>
                <GameButton size="sm" tone={ok ? 'green' : 'white'} disabled={!ok} onClick={() => fulfill(o.id)}>
                  <Truck className="size-3.5" /> 납품
                </GameButton>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-1.5">
        <p className="text-[0.75rem] font-black">
          🏪 직판 (×{marketingMul(c.staff).toFixed(2)}) · 품질 {'★'.repeat(q)}
        </p>
        {stockIds.length === 0 && <p className="text-[0.6875rem] font-semibold text-sub">완제품 재고가 없어요. 생산 탭에서 만들어요.</p>}
        <div className="thin-scroll min-h-0 flex-1 space-y-1 overflow-y-auto">
          {stockIds.map((id) => {
            const p = PRODUCT_MAP[id]
            return (
              <div key={id} className="flex items-center gap-1.5 rounded-xl bg-white p-1.5 text-[0.75rem] font-black">
                <span>{p.emoji}</span>
                <span className="min-w-0 flex-1 truncate">
                  {p.name} <span className="text-sub">×{c.stock[id]}</span>
                </span>
                <button onClick={(e) => sell(id, 10, e.currentTarget)} className="rounded-lg bg-sun-50 px-1.5 py-0.5 text-[0.625rem] text-[#B7860B]">
                  10개
                </button>
                <button onClick={(e) => sell(id, c.stock[id], e.currentTarget)} className="rounded-lg bg-sun px-1.5 py-0.5 text-[0.625rem] text-ink">
                  전부 {won(c.stock[id] * unitPrice(p, c.done))}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ───────── 회사 ───────── */
function CompanyTab() {
  const c = useCompany()
  const w = useWorld()
  const lv = companyLevel(c.xp)
  const [name, setName] = useState(c.name)
  return (
    <div className="grid h-full gap-3 md:grid-cols-[16rem_1fr]">
      <div className="space-y-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#5B6BBF] to-[#2E3B8A] p-3 text-white">
          <p className="text-[0.625rem] font-black opacity-80">FOOD COMPANY · 설립 {c.founded ?? w.region.dong}</p>
          <p className="text-[1.25rem] font-black leading-tight">🏭 {c.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] font-black">
            <span className="rounded-full bg-[#FFE27A] px-2 text-ink">Lv.{lv.level}</span>
            {lv.level >= MAX_LEVEL ? '최고 레벨' : `다음 레벨까지 ${lv.next - c.xp} XP`}
          </p>
          <Bar value={lv.progress} color="bg-[#FFE27A]" track="bg-white/25" className="mt-1.5" />
          <div className="mt-2 grid grid-cols-2 gap-1 text-center text-[0.6875rem] font-black">
            {[
              ['누적 매출', `${won(c.revenue)}원`],
              ['누적 생산', `${c.produced.toLocaleString()}개`],
              ['연구', `${c.done.length}/${RESEARCH.length}`],
              ['라인', `${c.lines}개`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white/15 py-1">
                <p className="text-[0.5625rem] opacity-80">{l}</p>
                <p>{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            placeholder="회사 이름"
            className="h-9 min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-white px-2 text-[0.8125rem] font-black outline-none focus:border-primary"
          />
          <GameButton size="sm" disabled={!name.trim() || name === c.name} onClick={() => (c.setName(name.trim()), sfx('pop'), toast('회사 이름을 바꿨어요'))}>
            저장
          </GameButton>
        </div>
        <p className="text-[0.625rem] font-semibold text-mute">XP: 생산 1개당 0.25 · 직판 300원당 1 · 납품 주문 · 연구 60 · 증설 100</p>
      </div>
      <div className="thin-scroll min-h-0 space-y-1.5 overflow-y-auto">
        {Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2).map((L) => (
          <div key={L} className={cx('flex items-start gap-2 rounded-2xl p-2', L <= lv.level ? 'bg-teal-50' : L === lv.level + 1 ? 'bg-[#FFF4D6] ring-2 ring-[#E8B93A]/40' : 'bg-black/5 opacity-70')}>
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl text-[0.75rem] font-black', L <= lv.level ? 'bg-teal text-white' : 'bg-white text-ink')}>
              {L <= lv.level ? <Check className="size-4" strokeWidth={3} /> : `Lv${L}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-black">
                Lv.{L} · {300 * (L - 1) * (L - 1)} XP
              </span>
              <span className="flex flex-wrap gap-1">
                {(LEVEL_PERKS[L] ?? ['🎖️ 명예 레벨']).map((t) => (
                  <span key={t} className="rounded-full bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-ink/80">
                    {t}
                  </span>
                ))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FactoryPanel({ onClose, goMarket, openSettings, initial }: { onClose: () => void; goMarket: () => void; openSettings: () => void; initial?: Tab }) {
  const name = useCompany((s) => s.name)
  const setName = useCompany((s) => s.setName)
  const me = useWorld((s) => s.name)
  const jobs = useCompany((s) => s.jobs)
  const active = useCompany((s) => s.active)
  const orders = useCompany((s) => openOrders(s).length)
  const evId = useCompany((s) => openEvent(s)?.id ?? null)
  const now = useNow(1000)
  const [tab, setTab] = useState<Tab>(initial ?? 'produce')
  useEffect(() => {
    if (!name) setName(`${me || '골목'} 푸드`)
  }, [name, me, setName])
  const readyLines = jobs.filter((j) => j && j.readyAt <= now).length
  const readyResearch = Object.values(active).filter((at) => at <= now).length
  return (
    <Panel
      title={name || '식품 공장'}
      icon="🏭"
      color="#5B6BBF"
      wide
      onClose={onClose}
      tabs={
        <div className="flex items-center gap-2">
          <Tabs<Tab>
            value={tab}
            onChange={(t) => {
              sfx('tap')
              setTab(t)
            }}
            tabs={[
              { id: 'produce', label: '⚙️ 생산', badge: readyLines },
              { id: 'research', label: '🔬 연구개발', badge: readyResearch },
              { id: 'expand', label: '🏗️ 증설' },
              { id: 'sell', label: '🚚 납품', badge: orders + (evId ? 1 : 0) },
              { id: 'staff', label: '🧑‍💼 직원' },
              { id: 'board', label: '👔 경영진' },
              { id: 'company', label: '🏢 회사' },
            ]}
          />
          <LevelBadge />
        </div>
      }
    >
      {tab === 'produce' && <ProduceTab goMarket={goMarket} />}
      {tab === 'research' && <ResearchTab />}
      {tab === 'expand' && <ExpandTab />}
      {tab === 'sell' && <SellTab />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'board' && <BoardroomTab openSettings={openSettings} />}
      {tab === 'company' && <CompanyTab />}
    </Panel>
  )
}

import { useMemo, useState } from 'react'
import { BookOpen, Check, Lock, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import type { BizType } from '@/types'
import { useGame, trainCost, upgradeCost } from '@/game/store'
import { BIZ_PROFILE, MARKETING, MAX_ACTIONS, PRODUCT_PRESETS, UPGRADES, WEATHER } from '@/game/data'
import { capacityOf, clampRef, costRate, eventFor, priceFactor, weatherFor } from '@/game/sim'
import type { DayDecision, MarketingId } from '@/game/types'
import { BIZ_TYPES } from '@/data/categories'
import { SHOP_COLORS, SHOP_EMOJIS, Stars } from '@/game/ui'
import { useWorld } from '../store'
import { defaultRecipe } from '../items'
import { canOpenShopToday, investUpgrade, lessonSkills, saveProduct, startShop, trainProduct, type NewProduct } from '../actions'
import { Card, Chip, cx, GameButton, Panel, Stepper, Tabs, toast, won } from '../ui/kit'
import { ProductForm } from './ProductForm'

type Tab = 'open' | 'items' | 'invest'

function presetAsNew(p: (typeof PRODUCT_PRESETS)['food'][number], biz: BizType): NewProduct {
  return { ...p, recipe: defaultRecipe(p.name, biz) }
}

/* ───────── 창업 ───────── */
export function ShopSetup({ onDone }: { onDone: () => void }) {
  const w = useWorld()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(`${w.name}네 가게`)
  const [color, setColor] = useState(SHOP_COLORS[1])
  const [emoji, setEmoji] = useState('🍲')
  const [biz, setBiz] = useState<BizType>('food')
  const [items, setItems] = useState<NewProduct[]>(() => PRODUCT_PRESETS.food.slice(0, 3).map((p) => presetAsNew(p, 'food')))
  const [editing, setEditing] = useState<number | null>(null)
  const pickBiz = (b: BizType) => {
    setBiz(b)
    setItems(PRODUCT_PRESETS[b].slice(0, 3).map((p) => presetAsNew(p, b)))
    setEmoji(SHOP_EMOJIS[['food', 'cafe', 'retail', 'beauty', 'service', 'etc'].indexOf(b) + 1] ?? '🏠')
  }

  if (editing !== null)
    return (
      <ProductForm
        biz={biz}
        initial={items[editing] ?? { name: '', emoji: '⭐', cost: 1000, price: 5000, ref: 5000, quality: 3, kind: 'goods', perishable: biz === 'food' || biz === 'cafe', recipe: { type: 'craft', inputs: [{ id: 'cabbage', qty: 2 }], yield: 8, minutes: 1.5 } }}
        onCancel={() => setEditing(null)}
        onSave={(p) => {
          setItems(editing < items.length ? items.map((x, i) => (i === editing ? p : x)) : [...items, p])
          setEditing(null)
        }}
      />
    )

  return (
    <div className="flex h-full flex-col">
      {step === 0 ? (
        <div className="grid flex-1 gap-3 md:grid-cols-2">
          <div className="space-y-2.5">
            <label className="block">
              <span className="text-[0.75rem] font-black text-sub">가게 이름</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} className="mt-1 h-11 w-full rounded-xl border-2 border-black/10 bg-white px-3 text-[1rem] font-black outline-none focus:border-primary" />
            </label>
            <div>
              <span className="text-[0.75rem] font-black text-sub">간판 색</span>
              <div className="mt-1 flex gap-2">
                {SHOP_COLORS.map((c) => (
                  <button key={c} aria-label={c} onClick={() => setColor(c)} className={cx('size-8 rounded-full ring-offset-2', color === c && 'ring-2 ring-ink')} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-[0.75rem] font-black text-sub">진열창 그림</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SHOP_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)} className={cx('grid size-9 place-items-center rounded-xl text-[1.25rem]', emoji === e ? 'bg-primary-50 ring-2 ring-primary' : 'bg-black/5')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <span className="text-[0.75rem] font-black text-sub">업종</span>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {BIZ_TYPES.map((b) => (
                <button key={b.id} onClick={() => pickBiz(b.id)} className={cx('h-14 rounded-2xl text-[0.8125rem] font-black', biz === b.id ? 'bg-ink text-white' : 'bg-white shadow-sm ring-1 ring-black/5')}>
                  {b.label}
                </button>
              ))}
            </div>
            <p className="mt-2 rounded-xl bg-sun-50 p-2.5 text-[0.75rem] font-semibold leading-relaxed">
              {w.fromEmployee ? `회사에서 모은 ${won(w.cash)}원으로 시작해요. 부족하면 창업지원센터의 정책자금을 알아보세요.` : '창업 자금 300만 원으로 시작해요. 임대료·인건비는 영업하는 날마다 나가요.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <p className="mb-2 text-[0.8125rem] font-semibold text-sub">판매 항목은 자유롭게 정해요 (최대 5개). 직접 만드는 건 재료와 레시피를, 도매 상품은 도매가를 정해요.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((p, i) => (
              <Card key={i} className="flex items-center gap-2">
                <span className="text-[1.5rem]">{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-black">{p.name}</span>
                  <span className="block text-[0.6875rem] font-semibold text-sub">
                    {p.recipe.type === 'craft' ? '🍳 직접 만들기' : p.recipe.type === 'buy' ? '📦 도매' : '✂️ 서비스'} · {p.price.toLocaleString()}원
                  </span>
                </span>
                <button aria-label="수정" onClick={() => setEditing(i)} className="grid size-8 place-items-center rounded-lg bg-black/5">
                  <Pencil className="size-4" />
                </button>
                {items.length > 1 && (
                  <button aria-label="삭제" onClick={() => setItems(items.filter((_, k) => k !== i))} className="grid size-8 place-items-center rounded-lg bg-coral-50 text-coral">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </Card>
            ))}
            {items.length < 5 && (
              <button onClick={() => setEditing(items.length)} className="flex h-14 items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/15 text-[0.875rem] font-black text-primary">
                <Plus className="size-4" /> 판매 항목 직접 만들기
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRODUCT_PRESETS[biz]
              .filter((p) => !items.some((x) => x.name === p.name))
              .map((p) => (
                <button key={p.name} disabled={items.length >= 5} onClick={() => setItems([...items, presetAsNew(p, biz)])} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-black shadow-sm ring-1 ring-black/5 disabled:opacity-40">
                  + {p.emoji} {p.name}
                </button>
              ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-between">
        <GameButton tone="white" onClick={() => setStep(0)} disabled={step === 0}>
          이전
        </GameButton>
        {step === 0 ? (
          <GameButton onClick={() => setStep(1)} disabled={name.trim().length < 2}>
            다음: 판매 항목
          </GameButton>
        ) : (
          <GameButton
            tone="coral"
            size="lg"
            onClick={() => {
              startShop({ shopName: name.trim(), shopEmoji: emoji, color, biz, products: items })
              toast(`🎉 ${name} 개업! 이제 재료를 모아 상품을 만들어요`, 'level')
              onDone()
            }}
          >
            🎊 개업하기
          </GameButton>
        )}
      </div>
    </div>
  )
}

/* ───────── 오늘 영업 ───────── */
function OpenTab({ onRun, goWorkshop, openLesson }: { onRun: (d: DayDecision) => void; goWorkshop: () => void; openLesson: (id: string) => void }) {
  const g = useGame()
  const w = useWorld()
  const skills = lessonSkills()
  const cap = capacityOf(g.biz, g.stats, skills)
  const event = useMemo(() => eventFor(g.seed, g.day + 1), [g.seed, g.day])
  const weather = weatherFor(g.seed, g.day + 1)
  const [plan, setPlan] = useState<Record<string, number>>(() => Object.fromEntries(g.products.map((p) => [p.id, w.stock[p.id] ?? 0])))
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(g.products.map((p) => [p.id, p.price])))
  const [mk, setMk] = useState<MarketingId[]>([])
  const [choice, setChoice] = useState<number | undefined>()
  const fixed = g.stats.staff * BIZ_PROFILE[g.biz].wage + 40000 * (g.tier + 1)
  const mkCost = mk.reduce((s, m) => s + MARKETING[m].cost, 0)
  const units = g.products.reduce((s, p) => s + (p.kind === 'goods' ? plan[p.id] ?? 0 : 0), 0)
  const hasGoods = g.products.some((p) => p.kind === 'goods')
  const needChoice = !!event && choice === undefined

  if (!canOpenShopToday())
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[2.5rem]">🌙</p>
          <p className="text-[1.0625rem] font-black">오늘 영업은 끝났어요</p>
          <p className="mt-1 text-[0.8125rem] text-sub">내일 다시 문을 열 수 있어요. 그동안 작물을 키우고 상품을 만들어 재고를 채워 두세요!</p>
        </div>
      </div>
    )

  return (
    <div className="grid h-full gap-3 md:grid-cols-[1.25fr_1fr]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[0.8125rem] font-black">
            진열·가격 <span className="text-sub">· 오늘 받을 수 있는 손님 약 {cap}명</span>
          </p>
          {hasGoods && (
            <button onClick={goWorkshop} className="text-[0.75rem] font-black text-primary">
              + 공방에서 더 만들기
            </button>
          )}
        </div>
        {g.products.map((p) => {
          const stock = w.stock[p.id] ?? 0
          const price = prices[p.id]
          const pf = priceFactor(clampRef(p), price)
          const rate = costRate({ cost: p.cost, price })
          return (
            <Card key={p.id} className="flex items-center gap-2">
              <span className="text-[1.5rem]">{p.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-black">{p.name}</span>
                <span className="flex flex-wrap gap-1">
                  {p.kind === 'goods' ? <Chip tone={stock ? 'blue' : 'coral'}>재고 {stock}</Chip> : <Chip tone="violet">서비스 · 손님 오는 만큼</Chip>}
                  <Chip tone={rate > 0.5 ? 'coral' : 'green'}>원가율 {Math.round(rate * 100)}%</Chip>
                  <Chip tone={pf > 1.15 ? 'blue' : pf < 0.8 ? 'coral' : 'mute'}>반응 {pf > 1.15 ? '좋음' : pf < 0.8 ? '비싸요' : '보통'}</Chip>
                </span>
              </span>
              {p.kind === 'goods' && (
                <span className="text-center">
                  <span className="block text-[0.625rem] font-black text-sub">진열</span>
                  <Stepper value={plan[p.id] ?? 0} max={stock} step={5} onChange={(v) => setPlan({ ...plan, [p.id]: v })} />
                </span>
              )}
              <span className="text-center">
                <span className="block text-[0.625rem] font-black text-sub">가격 (동네 {clampRef(p).toLocaleString()})</span>
                <Stepper value={price} min={100} step={p.price >= 20000 ? 1000 : 100} onChange={(v) => setPrices({ ...prices, [p.id]: v })} />
              </span>
            </Card>
          )
        })}
        {hasGoods && units === 0 && <p className="rounded-xl bg-coral-50 p-2 text-[0.75rem] font-bold text-coral">진열할 재고가 없어요. 공방에서 상품을 먼저 만들어 주세요.</p>}
      </div>

      <div className="space-y-2">
        <Card className="bg-gradient-to-br from-primary-50 to-white">
          <p className="text-[0.75rem] font-black text-primary">
            {WEATHER[weather].emoji} 오늘 날씨 {WEATHER[weather].label} · {g.day + 1}일차
          </p>
          {event ? (
            <>
              <p className="mt-1 text-[0.875rem] font-black">📌 {event.title}</p>
              <p className="text-[0.6875rem] text-sub">{event.body}</p>
              <div className="mt-1.5 space-y-1">
                {event.choices.map((c, i) => (
                  <button key={c.label} onClick={() => setChoice(i)} className={cx('flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[0.75rem] font-bold', choice === i ? 'bg-primary text-white' : 'bg-white ring-1 ring-black/10')}>
                    {choice === i ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-full ring-2 ring-black/15" />}
                    {c.label}
                  </button>
                ))}
              </div>
              {event.lessonId && (
                <button onClick={() => openLesson(event.lessonId!)} className="mt-1 flex items-center gap-1 text-[0.6875rem] font-black text-primary">
                  <BookOpen className="size-3.5" /> 관련 레슨 보기
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-[0.75rem] font-semibold text-sub">첫날이에요. 홍보로 동네에 가게를 알려 보세요!</p>
          )}
        </Card>
        <div>
          <p className="mb-1 flex items-center justify-between text-[0.75rem] font-black">
            홍보 (하루 {MAX_ACTIONS}가지)
            <span className="flex gap-1">
              {Array.from({ length: MAX_ACTIONS }, (_, i) => (
                <span key={i} className={cx('size-2.5 rounded-full', i < mk.length ? 'bg-primary' : 'bg-black/15')} />
              ))}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(MARKETING) as MarketingId[]).map((id) => {
              const m = MARKETING[id]
              const locked = !!m.needSkill && (skills[m.needSkill] ?? 0) < 1
              const on = mk.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => (locked ? m.lessonId && openLesson(m.lessonId) : setMk(on ? mk.filter((x) => x !== id) : mk.length >= MAX_ACTIONS ? mk : [...mk, id]))}
                  className={cx('relative rounded-xl p-1.5 text-left', on ? 'bg-primary text-white' : 'bg-white ring-1 ring-black/10', locked && 'opacity-55')}
                >
                  <span className="text-[1.0625rem]">{m.emoji}</span>
                  <span className="block text-[0.6875rem] font-black leading-tight">{m.label}</span>
                  <span className={cx('block text-[0.625rem] font-bold', on ? 'text-white/80' : 'text-sub')}>{m.cost ? `${won(m.cost)}원` : '무료'}</span>
                  {locked && <Lock className="absolute right-1 top-1 size-3" />}
                </button>
              )
            })}
          </div>
        </div>
        <Card className="text-[0.75rem] font-bold">
          <p className="flex justify-between">
            <span className="text-sub">진열 상품</span>
            <span>{hasGoods ? `${units}개` : '서비스'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">오늘 나갈 돈 (임대료·인건비·홍보)</span>
            <span>{won(fixed + mkCost)}원</span>
          </p>
        </Card>
        <GameButton tone="coral" size="lg" className="w-full" disabled={needChoice || (hasGoods && units === 0)} onClick={() => onRun({ plan, prices, marketing: mk, eventChoice: choice })}>
          {needChoice ? '오늘 상황에 대응을 골라 주세요' : '🔔 영업 시작!'}
        </GameButton>
      </div>
    </div>
  )
}

/* ───────── 판매 항목 ───────── */
function ItemsTab() {
  const g = useGame()
  const w = useWorld()
  const [editing, setEditing] = useState<(NewProduct & { id?: string }) | null>(null)
  if (editing)
    return (
      <ProductForm
        biz={g.biz}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(p) => {
          saveProduct({ ...p, id: editing.id, quality: editing.quality })
          toast('판매 항목을 저장했어요')
          setEditing(null)
        }}
      />
    )
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {g.products.map((p) => {
        const r = w.recipes[p.id] ?? defaultRecipe(p.name, g.biz)
        return (
          <Card key={p.id} className="flex items-center gap-2">
            <span className="text-[1.5rem]">{p.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] font-black">{p.name}</span>
              <span className="flex items-center gap-1 text-[0.6875rem] font-semibold text-sub">
                품질 <Stars value={p.quality} size={10} /> · {p.price.toLocaleString()}원 · 원가 {p.cost.toLocaleString()}
              </span>
              <span className="block text-[0.625rem] font-bold text-mute">{r.type === 'craft' ? `🍳 한 번에 ${r.yield}개` : r.type === 'buy' ? '📦 도매시장에서 들여오기' : '✂️ 서비스'}</span>
            </span>
            <button aria-label="수정" onClick={() => setEditing({ ...p, recipe: r })} className="grid size-8 place-items-center rounded-lg bg-black/5">
              <Pencil className="size-4" />
            </button>
            {g.products.length > 1 && (
              <button aria-label="삭제" onClick={() => g.removeProduct(p.id)} className="grid size-8 place-items-center rounded-lg bg-coral-50 text-coral">
                <Trash2 className="size-4" />
              </button>
            )}
          </Card>
        )
      })}
      {g.products.length < 5 && (
        <button
          onClick={() => setEditing({ name: '', emoji: '⭐', cost: 1000, price: 5000, ref: 5000, quality: 3, kind: 'goods', perishable: true, recipe: { type: 'craft', inputs: [{ id: 'cabbage', qty: 2 }], yield: 8, minutes: 1.5 } })}
          className="flex h-16 items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/15 text-[0.875rem] font-black text-primary"
        >
          <Plus className="size-4" /> 판매 항목 추가
        </button>
      )}
    </div>
  )
}

/* ───────── 투자 ───────── */
function InvestTab() {
  const g = useGame()
  const w = useWorld()
  const skills = lessonSkills()
  const discount = Math.min(0.3, 0.05 * skills.support)
  const prof = BIZ_PROFILE[g.biz]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-[0.8125rem] font-black">
          가게 키우기 {discount > 0 && <Chip tone="green">지원사업 노하우 할인 {Math.round(discount * 100)}%</Chip>}
        </p>
        {(Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]).map((k) => {
          const u = UPGRADES[k]
          const lv = g.stats[k]
          const cost = upgradeCost(k, lv, discount)
          const eff = k === 'equipment' ? `손님 +${prof.equipCapacity}명` : k === 'staff' ? `손님 +${prof.staffCapacity}명 · 하루 ${won(prof.wage)}원` : '평판 UP · 인지도 +3'
          return (
            <Card key={k} className="flex items-center gap-2">
              <span className="text-[1.5rem]">{u.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-black">
                  {u.label} <span className="text-primary">Lv.{lv}/{u.max}</span>
                </span>
                <span className="block text-[0.6875rem] font-semibold text-teal">{eff}</span>
              </span>
              <GameButton size="sm" tone="primary" disabled={cost === null || w.cash < cost} onClick={() => toast(investUpgrade(k, discount) ? `${u.label} 완료!` : '돈이 부족해요', 'good')}>
                {cost === null ? '최대' : `${won(cost)}원`}
              </GameButton>
            </Card>
          )
        })}
      </div>
      <div className="space-y-2">
        <p className="text-[0.8125rem] font-black">품질 올리기 (레시피·기술 교육)</p>
        {g.products.map((p) => {
          const cost = trainCost(p.quality, discount)
          return (
            <Card key={p.id} className="flex items-center gap-2">
              <span className="text-[1.375rem]">{p.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-black">{p.name}</span>
                <Stars value={p.quality} size={11} />
              </span>
              <GameButton size="sm" tone="sun" disabled={cost === null || w.cash < cost} onClick={() => toast(trainProduct(p.id, discount) ? `${p.name} 품질 UP!` : '돈이 부족해요')}>
                {cost === null ? '최고' : `${won(cost)}원`}
              </GameButton>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function ShopPanel({ onClose, onRun, goWorkshop, openLesson, goCompany }: { onClose: () => void; onRun: (d: DayDecision) => void; goWorkshop: () => void; openLesson: (id: string) => void; goCompany: () => void }) {
  const g = useGame()
  const w = useWorld()
  const [tab, setTab] = useState<Tab>('open')

  if (!g.started) {
    if (w.path === 'employee')
      return (
        <Panel title="빈 가게 (임대)" icon="🔑" color="#6B7280" onClose={onClose}>
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-[2.5rem]">🔑</p>
              <p className="text-[1rem] font-black">아직은 비어 있는 가게예요</p>
              <p className="mt-1 max-w-[26rem] text-[0.8125rem] text-sub">골목상사에서 일하며 돈과 실력을 모은 뒤, 퇴사하면 이곳에서 내 가게를 열 수 있어요.</p>
              <GameButton className="mt-3" onClick={goCompany}>
                골목상사로
              </GameButton>
            </div>
          </div>
        </Panel>
      )
    return (
      <Panel title="내 가게 창업하기" icon={<Store className="size-5 text-white" />} color="#F25C54" wide onClose={onClose}>
        <ShopSetup onDone={onClose} />
      </Panel>
    )
  }

  return (
    <Panel
      title={g.shopName}
      icon={g.shopEmoji}
      color={g.color}
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'open', label: '🔔 오늘 영업' },
            { id: 'items', label: '📋 판매 항목' },
            { id: 'invest', label: '🔧 가게 투자' },
          ]}
        />
      }
    >
      {tab === 'open' && <OpenTab onRun={onRun} goWorkshop={goWorkshop} openLesson={openLesson} />}
      {tab === 'items' && <ItemsTab />}
      {tab === 'invest' && <InvestTab />}
    </Panel>
  )
}

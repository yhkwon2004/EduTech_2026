import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, Swords, Trash2 } from 'lucide-react'
import type { BizType } from '@/types'
import { useApp } from '@/store/app'
import { BIZ_TYPES } from '@/data/categories'
import { useGame } from '@/game/store'
import { LEAGUE_NAME, PERSONALITY, PRODUCT_PRESETS, SIDO } from '@/game/data'
import { SHOP_COLORS, SHOP_EMOJIS, Storefront } from '@/game/ui'
import type { Product } from '@/game/types'
import { Icon } from '@/components/Icon'
import { cx, PrimaryButton, TopBar } from '@/components/ui'
import { ProductEditor } from './ProductEditor'

type Draft = Omit<Product, 'id' | 'stock'> & { key: string }

export function GameSetup() {
  const nav = useNavigate()
  const profile = useApp((s) => s.profile)
  const start = useGame((s) => s.start)
  const rivals = useGame((s) => s.rivals)
  const [step, setStep] = useState(0)
  const [sido, setSido] = useState('서울')
  const [gu, setGu] = useState('')
  const [dong, setDong] = useState('')
  const [shopName, setShopName] = useState(profile.shopName || `${profile.name} 사장님네`)
  const [emoji, setEmoji] = useState('🏠')
  const [color, setColor] = useState(SHOP_COLORS[0])
  const [biz, setBiz] = useState<BizType>(profile.bizType)
  const [items, setItems] = useState<Draft[]>(() => PRODUCT_PRESETS[profile.bizType].slice(0, 3).map((p, i) => ({ ...p, key: `k${i}` })))
  const [editing, setEditing] = useState<Draft | null>(null)

  const region = { sido, gu: gu.trim() || `${sido} 어딘가구`, dong: dong.trim() }
  const valid0 = dong.trim().length >= 2
  const valid1 = shopName.trim().length >= 2
  const valid2 = items.length >= 1

  const changeBiz = (b: BizType) => {
    setBiz(b)
    setItems(PRODUCT_PRESETS[b].slice(0, 3).map((p, i) => ({ ...p, key: `k${b}${i}` })))
  }

  const open = () => {
    start({ shopName: shopName.trim(), shopEmoji: emoji, color, biz, region, products: items.map(({ key: _k, ...p }) => (void _k, p)) })
    setStep(3)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={['어느 동네에서 장사할까요?', '가게를 꾸며요', '무엇을 팔까요?', '동네 경쟁 가게들'][step]} onBack={step > 0 && step < 3 ? () => setStep(step - 1) : undefined} />
      <div className="px-5">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-line')} />
          ))}
        </div>
      </div>

      <div key={step} className="flex-1 animate-slide-in px-5 pb-6 pt-5">
        {step === 0 && (
          <>
            <p className="text-[0.9375rem] leading-relaxed text-sub">
              우리 동네 가게들과 경쟁해요. 동네 1등 → <b className="text-ink">구 리그</b> → <b className="text-ink">시·도 리그</b>까지 올라가 지역 최고의 소상공인이 되어 보세요.
            </p>
            <p className="mt-6 text-[0.8125rem] font-bold text-sub">시·도</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIDO.map((s) => (
                <button
                  key={s}
                  onClick={() => setSido(s)}
                  aria-pressed={sido === s}
                  className={cx('rounded-full px-3.5 py-2 text-[0.875rem] font-bold', sido === s ? 'bg-primary text-white' : 'bg-white text-ink shadow-card')}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="text-[0.8125rem] font-bold text-sub">구·군·시</span>
              <input
                value={gu}
                onChange={(e) => setGu(e.target.value)}
                maxLength={12}
                placeholder="예: 마포구"
                className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[0.8125rem] font-bold text-sub">동네 (동·읍·면)</span>
              <input
                value={dong}
                onChange={(e) => setDong(e.target.value)}
                maxLength={12}
                placeholder="예: 망원동"
                className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
              />
            </label>
            {valid0 && (
              <div className="mt-5 flex animate-fade-in items-center gap-3 rounded-2xl bg-primary-50 p-4">
                <MapPin className="size-5 shrink-0 text-primary" />
                <p className="text-[0.875rem] font-bold text-primary-700">
                  {LEAGUE_NAME(0, region)}에서 시작해요
                  <span className="block text-[0.75rem] font-semibold text-sub">
                    다음 단계: {LEAGUE_NAME(1, region)} → {LEAGUE_NAME(2, region)}
                  </span>
                </p>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="overflow-hidden rounded-[1.5rem] shadow-card">
              <Storefront name={shopName || '우리 가게'} emoji={emoji} color={color} />
            </div>
            <label className="mt-5 block">
              <span className="text-[0.8125rem] font-bold text-sub">가게 이름</span>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                maxLength={14}
                className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary focus:ring-2"
              />
            </label>
            <p className="mt-4 text-[0.8125rem] font-bold text-sub">간판 색</p>
            <div className="mt-2 flex gap-2.5">
              {SHOP_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`색 ${c}`}
                  onClick={() => setColor(c)}
                  className={cx('size-9 rounded-full ring-offset-2 transition', color === c && 'ring-2 ring-ink')}
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="mt-4 text-[0.8125rem] font-bold text-sub">진열창 그림</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SHOP_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cx('grid size-11 place-items-center rounded-2xl text-[1.375rem]', emoji === e ? 'bg-primary-50 ring-2 ring-primary' : 'bg-white shadow-card')}
                >
                  {e}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[0.8125rem] font-bold text-sub">업종</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BIZ_TYPES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => changeBiz(b.id)}
                  aria-pressed={biz === b.id}
                  className={cx('flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[0.8125rem] font-bold', biz === b.id ? 'bg-primary text-white' : 'bg-white text-ink shadow-card')}
                >
                  <Icon name={b.icon} className="size-5" />
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[0.875rem] leading-relaxed text-sub">
              판매 항목은 자유롭게 정할 수 있어요 (최대 5개). 원가와 가격을 정하면 <b className="text-ink">원가율</b>이 계산돼요. 동네 평균 가격은 손님이 비교하는 기준이에요.
            </p>
            <div className="mt-4 space-y-2.5">
              {items.map((p) => {
                const rate = p.price ? p.cost / p.price : 1
                return (
                  <div key={p.key} className="flex items-center gap-3 rounded-[1.25rem] bg-white p-3.5 shadow-card">
                    <button onClick={() => setEditing(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-[1.5rem]">{p.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-bold">{p.name}</span>
                        <span className="block text-[0.75rem] font-semibold text-sub">
                          원가 {p.cost.toLocaleString()} · 판매 {p.price.toLocaleString()}원 ·{' '}
                          <span className={rate > 0.5 ? 'text-coral' : 'text-teal'}>원가율 {Math.round(rate * 100)}%</span>
                        </span>
                        <span className="block text-[0.6875rem] font-semibold text-mute">
                          {p.kind === 'service' ? '서비스 (받을 때 원가)' : p.perishable ? '당일 판매 (남으면 폐기)' : '보관 가능 (재고로 남음)'}
                        </span>
                      </span>
                    </button>
                    {items.length > 1 && (
                      <button aria-label="삭제" onClick={() => setItems(items.filter((x) => x.key !== p.key))} className="grid size-8 place-items-center rounded-full text-coral">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })}
              {items.length < 5 && (
                <button
                  onClick={() =>
                    setEditing({ key: `new${Date.now()}`, name: '', emoji: '⭐', cost: 2000, price: 6000, ref: 6000, quality: 3, kind: biz === 'beauty' || biz === 'service' ? 'service' : 'goods', perishable: biz === 'food' || biz === 'cafe' })
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-[1.25rem] border-2 border-dashed border-line py-4 text-[0.9375rem] font-bold text-primary"
                >
                  <Plus className="size-5" /> 판매 항목 추가
                </button>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {PRODUCT_PRESETS[biz]
                  .filter((p) => !items.some((x) => x.name === p.name))
                  .map((p) => (
                    <button
                      key={p.name}
                      disabled={items.length >= 5}
                      onClick={() => setItems([...items, { ...p, key: `p${Date.now()}${p.name}` }])}
                      className="rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-bold shadow-card disabled:opacity-40"
                    >
                      + {p.emoji} {p.name}
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-[1.5rem] bg-gradient-to-br from-ink to-[#3B3E73] p-5 text-white">
              <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-white/70">
                <Swords className="size-4" /> {LEAGUE_NAME(0, region)} · 시즌 1
              </p>
              <p className="mt-1 text-[1.25rem] font-extrabold leading-snug">
                {region.dong}에 이런 가게들이 있어요.
                <br />
                7일 동안 TOP 3에 들면 승급!
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {rivals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg text-[1.375rem]">{r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{r.name}</span>
                    <span className="block text-[0.75rem] font-semibold text-sub">
                      {PERSONALITY[r.personality].label} · {PERSONALITY[r.personality].desc}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pb-safe-6 px-5">
        {step < 2 && (
          <PrimaryButton onClick={() => setStep(step + 1)} disabled={step === 0 ? !valid0 : !valid1}>
            다음
          </PrimaryButton>
        )}
        {step === 2 && (
          <PrimaryButton onClick={open} disabled={!valid2}>
            개업하기!
          </PrimaryButton>
        )}
        {step === 3 && <PrimaryButton onClick={() => nav('/game/play', { replace: true })}>첫 장사 시작하기</PrimaryButton>}
      </div>

      {editing && (
        <ProductEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            const exists = items.some((x) => x.key === editing.key)
            const next = { ...p, key: editing.key }
            setItems(exists ? items.map((x) => (x.key === editing.key ? next : x)) : [...items, next])
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '@/game/types'
import { EMOJI_CHOICES } from '@/game/data'
import { clampRef } from '@/game/sim'
import { cx, PrimaryButton, Segmented, Sheet, Toggle } from '@/components/ui'

type P = Omit<Product, 'id' | 'stock'>

function NumField({ label, value, onChange, step = 100, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string }) {
  return (
    <label className="block rounded-2xl bg-bg px-4 py-2.5">
      <span className="flex items-center justify-between text-[0.75rem] font-bold text-sub">
        {label}
        {hint && <span className="font-semibold text-mute">{hint}</span>}
      </span>
      <span className="mt-0.5 flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={value || ''}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className="w-full min-w-0 bg-transparent text-[1.125rem] font-extrabold outline-none"
        />
        <span className="text-[0.875rem] font-bold text-sub">원</span>
      </span>
    </label>
  )
}

export function ProductEditor({ initial, onClose, onSave }: { initial: P; onClose: () => void; onSave: (p: P) => void }) {
  const nav = useNavigate()
  const [p, setP] = useState<P>(initial)
  const rate = p.price > 0 ? p.cost / p.price : 1
  const margin = p.price - p.cost
  const ref = clampRef(p)
  const vsRef = p.price / Math.max(1, ref)
  const valid = p.name.trim().length >= 1 && p.cost > 0 && p.price > 0

  return (
    <Sheet
      open
      onClose={onClose}
      title={initial.name ? '판매 항목 수정' : '판매 항목 추가'}
      footer={
        <PrimaryButton arrow={false} disabled={!valid} onClick={() => onSave({ ...p, name: p.name.trim(), ref: p.ref || p.price })}>
          저장
        </PrimaryButton>
      }
    >
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            onClick={() => setP({ ...p, emoji: e })}
            className={cx('grid size-11 shrink-0 place-items-center rounded-2xl text-[1.375rem]', p.emoji === e ? 'bg-primary-50 ring-2 ring-primary' : 'bg-bg')}
          >
            {e}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-[0.8125rem] font-bold text-sub">이름</span>
        <input
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
          maxLength={12}
          placeholder="예: 수제 떡볶이"
          className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none ring-primary placeholder:text-mute focus:ring-2"
        />
      </label>

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">종류</p>
      <div className="mt-1.5">
        <Segmented<'goods' | 'service'>
          value={p.kind}
          onChange={(v) => setP({ ...p, kind: v, perishable: v === 'goods' ? p.perishable : false })}
          options={[
            { value: 'goods', label: '상품 (미리 만들기)' },
            { value: 'service', label: '서비스 (받을 때)' },
          ]}
        />
      </div>
      {p.kind === 'goods' && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
          <span>
            <span className="block text-[0.875rem] font-bold">당일 판매 상품</span>
            <span className="block text-[0.75rem] text-sub">{p.perishable ? '못 팔면 그날 폐기돼요 (음식 등)' : '못 팔면 재고로 남아요 (공산품 등)'}</span>
          </span>
          <Toggle checked={p.perishable} onChange={(v) => setP({ ...p, perishable: v })} label="당일 판매" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <NumField label="원가 (1개)" value={p.cost} onChange={(v) => setP({ ...p, cost: v })} />
        <NumField label="판매가" value={p.price} onChange={(v) => setP({ ...p, price: v })} />
      </div>
      <div className="mt-2.5">
        <NumField label="동네 평균 가격" hint="손님이 비교하는 기준" value={p.ref} onChange={(v) => setP({ ...p, ref: v })} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className={cx('rounded-2xl py-2.5', rate > 0.5 ? 'bg-coral-50 text-coral' : 'bg-teal-50 text-teal')}>
          <p className="text-[1.0625rem] font-extrabold">{Math.round(rate * 100)}%</p>
          <p className="text-[0.6875rem] font-bold">원가율</p>
        </div>
        <div className="rounded-2xl bg-bg py-2.5">
          <p className="text-[1.0625rem] font-extrabold">{margin.toLocaleString()}</p>
          <p className="text-[0.6875rem] font-bold text-sub">1개당 남는 돈</p>
        </div>
        <div className={cx('rounded-2xl py-2.5', vsRef > 1.2 ? 'bg-orange-50 text-orange' : vsRef < 0.85 ? 'bg-primary-50 text-primary' : 'bg-bg')}>
          <p className="text-[1.0625rem] font-extrabold">{vsRef > 1.2 ? '비싼 편' : vsRef < 0.85 ? '싼 편' : '적당'}</p>
          <p className="text-[0.6875rem] font-bold text-sub">동네 대비</p>
        </div>
      </div>
      {ref !== (p.ref || 0) && p.ref > 0 && (
        <p className="mt-2 text-[0.75rem] font-semibold text-mute">※ 동네 평균은 원가에 비해 너무 높거나 낮으면 {ref.toLocaleString()}원으로 맞춰 계산해요.</p>
      )}
      <button onClick={() => nav('/lesson/l-cost-1')} className="mt-3 mb-2 flex items-center gap-1.5 text-[0.8125rem] font-bold text-primary">
        <BookOpen className="size-4" /> 원가율 계산 레슨 (4분)
      </button>
    </Sheet>
  )
}

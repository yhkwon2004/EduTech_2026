import { useState } from 'react'
import { useWorld, levelOf } from '../store'
import { CROPS, INGREDIENTS, buyPrice, itemInfo, priceFactor, seedPrice, sellPrice } from '../items'
import { useGame } from '@/game/store'
import { todayKey } from '@/lib/date'
import { Card, Chip, GameButton, Panel, Stepper, Tabs, toast, won } from '../ui/kit'

type Tab = 'seed' | 'item' | 'stock' | 'sell'

function PriceTag({ f }: { f: number }) {
  if (f <= 0.9) return <Chip tone="green">오늘 싸요 ↓</Chip>
  if (f >= 1.15) return <Chip tone="coral">오늘 비싸요 ↑</Chip>
  return <Chip>보통</Chip>
}

function Row({ emoji, name, sub, price, tag, have, onBuy, label = '사기', tone = 'primary' as const }: { emoji: string; name: string; sub: string; price: number; tag?: React.ReactNode; have: number; onBuy: (qty: number) => void; label?: string; tone?: 'primary' | 'sun' }) {
  const [qty, setQty] = useState(label === '팔기' ? Math.min(have, 1) : 5)
  return (
    <Card className="flex items-center gap-2.5">
      <span className="text-[1.75rem]">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.875rem] font-black">{name}</span>
          {tag}
        </span>
        <span className="block text-[0.6875rem] font-semibold text-sub">
          {sub} · 가진 것 {have}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-[0.875rem] font-black">{price.toLocaleString()}원</span>
        <span className="block text-[0.625rem] font-bold text-mute">합계 {won(price * qty)}원</span>
      </span>
      <Stepper value={qty} onChange={setQty} min={label === '팔기' ? 0 : 1} max={label === '팔기' ? have : 99} />
      <GameButton size="sm" tone={tone} onClick={() => onBuy(qty)} disabled={qty <= 0}>
        {label}
      </GameButton>
    </Card>
  )
}

export function MarketPanel({ onClose }: { onClose: () => void }) {
  const w = useWorld()
  const g = useGame()
  const [tab, setTab] = useState<Tab>('seed')
  const date = todayKey()
  const level = levelOf(w.exp).level
  const buyGoods = g.started ? g.products.filter((p) => w.recipes[p.id]?.type === 'buy') : []

  const pay = (ok: boolean, msg: string) => toast(ok ? msg : '돈이 부족해요', ok ? 'good' : 'bad')

  return (
    <Panel
      title="도매시장"
      icon="🛒"
      color="#2F8F3E"
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'seed', label: '🌱 씨앗' },
            { id: 'item', label: '🥩 재료' },
            ...(buyGoods.length ? [{ id: 'stock' as Tab, label: '📦 도매 상품' }] : []),
            { id: 'sell', label: '💰 팔기' },
          ]}
        />
      }
      footer={
        <p className="text-[0.75rem] font-semibold text-sub">
          💡 시세는 매일 바뀌어요. 싼 날 미리 사 두고, 직접 키울 수 있는 건 키우면 원가가 내려가요. 🪙 {won(w.cash)}원
        </p>
      }
    >
      <div className="grid gap-2 md:grid-cols-2">
        {tab === 'seed' &&
          CROPS.map((c) => {
            const locked = level < c.level
            const price = seedPrice(date, c.id)
            return locked ? (
              <Card key={c.id} className="flex items-center gap-2.5 opacity-60">
                <span className="text-[1.75rem] grayscale">{c.emoji}</span>
                <span className="flex-1 text-[0.875rem] font-black">{c.name} 씨앗</span>
                <Chip>🔒 Lv{c.level}</Chip>
              </Card>
            ) : (
              <Row
                key={c.id}
                emoji={c.emoji}
                name={`${c.name} 씨앗`}
                sub={`${c.paddy ? '논' : '밭'} · ${c.minutes}분 · 수확 ${c.yield}개 (시장가 ${won(c.price * c.yield)}원어치)`}
                price={price}
                have={w.seeds[c.id] ?? 0}
                onBuy={(q) => pay(w.buy('seed', c.id, q, price), `${c.emoji} ${c.name} 씨앗 ${q}개를 샀어요`)}
              />
            )
          })}
        {tab === 'item' &&
          [...INGREDIENTS, ...CROPS.filter((c) => level >= c.level)].map((i) => {
            const price = buyPrice(date, i.id)
            const info = itemInfo(i.id)
            return (
              <Row
                key={i.id}
                emoji={info.emoji}
                name={info.name}
                sub={CROPS.some((c) => c.id === i.id) ? '작물 (키울 수도 있어요)' : '재료'}
                price={price}
                tag={<PriceTag f={priceFactor(date, i.id)} />}
                have={w.inventory[i.id] ?? 0}
                onBuy={(q) => pay(w.buy('item', i.id, q, price), `${info.emoji} ${info.name} ${q}개를 샀어요`)}
              />
            )
          })}
        {tab === 'stock' &&
          buyGoods.map((p) => (
            <Row
              key={p.id}
              emoji={p.emoji}
              name={`${p.name} (도매)`}
              sub={`판매가 ${p.price.toLocaleString()}원 · 원가율 ${Math.round((p.cost / p.price) * 100)}%`}
              price={p.cost}
              have={w.stock[p.id] ?? 0}
              onBuy={(q) => pay(w.buyStock(p.id, q, p.cost), `${p.emoji} ${p.name} ${q}개를 들여왔어요`)}
            />
          ))}
        {tab === 'sell' &&
          (() => {
            const ids = Object.keys(w.inventory).filter((id) => (w.inventory[id] ?? 0) > 0)
            if (!ids.length) return <p className="col-span-full py-8 text-center text-[0.875rem] font-semibold text-sub">팔 작물·재료가 없어요. 텃밭에서 키워 보세요!</p>
            return ids.map((id) => {
              const info = itemInfo(id)
              const price = sellPrice(date, id)
              return (
                <Row
                  key={id}
                  emoji={info.emoji}
                  name={info.name}
                  sub="시장에 넘기는 값 (기준가의 60%)"
                  price={price}
                  tag={<PriceTag f={priceFactor(date, id)} />}
                  have={w.inventory[id]}
                  label="팔기"
                  tone="sun"
                  onBuy={(q) => {
                    if (w.sell(id, q, price)) toast(`${info.emoji} ${info.name} ${q}개를 팔았어요 +${won(q * price)}원`)
                  }}
                />
              )
            })
          })()}
      </div>
    </Panel>
  )
}

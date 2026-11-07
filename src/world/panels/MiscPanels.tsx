import { useEffect, useState } from 'react'
import { toLook } from '../avatar'
import { Turntable } from './CharacterPanel'
import { RotateCcw } from 'lucide-react'
import type { Personality } from '@/game/types'
import { useGame } from '@/game/store'
import { PERSONALITY } from '@/game/data'
import { Stars } from '@/game/ui'
import { useApp } from '@/store/app'
import { todayKey } from '@/lib/date'
import { useWorld, levelOf } from '../store'
import { CROPS, itemInfo } from '../items'
import { RIVAL_PLACEHOLDER } from '../map'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, toast, won } from '../ui/kit'
import { setAudio, sfx } from '../audio'

/* ───────── 이웃 가게 (경쟁 상대 관찰) ───────── */
const COUNTER: Record<Personality, { watch: string; counter: string }> = {
  price: {
    watch: '가격표를 보세요. 동네 평균보다 싸게 팔아 손님을 끌어요.',
    counter: '가격으로 맞서면 둘 다 손해예요. 품질·서비스·단골 혜택으로 차별화해요.',
  },
  quality: {
    watch: '재료와 손맛에 공을 들여 평판이 높아요.',
    counter: '레슨으로 품질을 올리고, 위생·응대에서 밀리지 않게 챙겨요.',
  },
  marketing: {
    watch: '전단지·SNS 등 홍보를 자주 해서 인지도가 높아요.',
    counter: '지도 정보 정리 같은 무료 홍보를 꾸준히, 리뷰 답글로 신뢰를 쌓아요.',
  },
  steady: {
    watch: '큰 이벤트는 없지만 매일 같은 품질로 단골이 탄탄해요.',
    counter: '품절·폐기를 줄이는 준비량 관리로 하루하루 이익을 쌓아요.',
  },
  trendy: {
    watch: 'SNS에서 뜨면 손님이 확 몰리지만 기복이 커요.',
    counter: '유행이 꺾이는 날을 노려 신메뉴·이벤트로 손님을 데려와요.',
  },
}

const visitedToday = new Set<string>()

export function RivalPanel({ index, onClose }: { index: number; onClose: () => void }) {
  const g = useGame()
  const rv = g.started ? g.rivals[index] : undefined
  const ph = RIVAL_PLACEHOLDER[index]
  useEffect(() => {
    const key = `${todayKey()}:${index}`
    if (visitedToday.has(key)) return
    visitedToday.add(key)
    useWorld.getState().bump('rivalVisits')
    useWorld.getState().addExp(2)
  }, [index])

  if (!rv)
    return (
      <Panel title={ph.name} icon={ph.emoji} color="#8E6BBF" onClose={onClose}>
        <div className="grid h-full gap-3 md:grid-cols-[1fr_1fr]">
          <Card className="text-center">
            <p className="text-[2.5rem] leading-none">{ph.emoji}</p>
            <p className="mt-1 text-[1rem] font-black">{ph.name}</p>
            <p className="text-[0.8125rem] font-semibold text-sub">오늘도 손님이 꽤 있네요.</p>
          </Card>
          <Card>
            <p className="text-[0.875rem] font-black">👀 가게 관찰 노트</p>
            <ul className="mt-1 space-y-1 text-[0.75rem] font-semibold text-ink/80">
              <li>• 가격: 대표 메뉴 값이 동네 평균과 비슷한가요?</li>
              <li>• 손님: 언제 붐비고 언제 한가한가요?</li>
              <li>• 홍보: 간판·메뉴판·SNS는 어떻게 하고 있나요?</li>
            </ul>
            <p className="mt-2 text-[0.6875rem] font-bold text-sub">창업하면 이 가게들과 동네 리그에서 매일 순위를 겨뤄요.</p>
          </Card>
        </div>
      </Panel>
    )

  const p = PERSONALITY[rv.personality]
  const price = Math.round((rv.priceLevel - 1) * 100)
  const c = COUNTER[rv.personality]
  return (
    <Panel title={rv.name} icon={rv.emoji} color="#8E6BBF" onClose={onClose}>
      <div className="grid h-full gap-3 md:grid-cols-[1fr_1.1fr]">
        <Card>
          <div className="flex items-center gap-2">
            <span className="text-[2rem]">{rv.emoji}</span>
            <span>
              <span className="block text-[1rem] font-black">{rv.name}</span>
              <span className="flex items-center gap-1">
                <Chip tone="violet">{p.label}</Chip>
                <Chip>{rv.type}</Chip>
              </span>
            </span>
          </div>
          <div className="mt-2 space-y-1.5 text-[0.75rem] font-bold">
            <p className="flex items-center justify-between">
              평판 <Stars value={rv.reputation} size={12} />
            </p>
            <div>
              <p className="flex justify-between">
                <span>인지도</span>
                <span>{Math.round(rv.awareness)}</span>
              </p>
              <Bar value={rv.awareness / 100} color="bg-violet" />
            </div>
            <p className="flex justify-between">
              <span>가격</span>
              <span className={price < 0 ? 'text-teal' : price > 0 ? 'text-coral' : ''}>{price === 0 ? '동네 평균' : `평균보다 ${Math.abs(price)}% ${price < 0 ? '싸요' : '비싸요'}`}</span>
            </p>
            <p className="flex justify-between">
              <span>하루 손님 한도</span>
              <span>약 {Math.round(rv.capacity)}명</span>
            </p>
            <p className="flex justify-between">
              <span>시즌 점수 · 어제 순위</span>
              <span>
                {rv.seasonScore.toLocaleString()} · {rv.lastRank ? `${rv.lastRank}위` : '-'}
              </span>
            </p>
          </div>
          {rv.news && <p className="mt-2 rounded-xl bg-sun-50 p-2 text-[0.75rem] font-bold text-[#8A6508]">📰 {rv.news}</p>}
        </Card>
        <div className="space-y-2">
          <Card>
            <p className="text-[0.875rem] font-black">👀 관찰 포인트</p>
            <p className="mt-0.5 text-[0.75rem] font-semibold text-ink/80">{c.watch}</p>
          </Card>
          <Card className="bg-gradient-to-br from-[#EEF4FF] to-[#E2EBFF]">
            <p className="text-[0.875rem] font-black">♟️ 이렇게 이겨 봐요</p>
            <p className="mt-0.5 text-[0.75rem] font-semibold text-ink/80">{c.counter}</p>
          </Card>
          <p className="text-[0.6875rem] font-semibold text-mute">{p.desc}</p>
        </div>
      </div>
    </Panel>
  )
}

/* ───────── 가방 ───────── */
type BagTab = 'items' | 'seeds' | 'stock' | 'record'

export function BagPanel({ onClose }: { onClose: () => void }) {
  const w = useWorld()
  const g = useGame()
  const [tab, setTab] = useState<BagTab>('items')
  const items = Object.entries(w.inventory).filter(([, n]) => n > 0)
  const seeds = CROPS.filter((c) => (w.seeds[c.id] ?? 0) > 0)
  const Tile = ({ emoji, name, n, sub }: { emoji: string; name: string; n: number; sub?: string }) => (
    <div className="relative flex flex-col items-center rounded-2xl border-2 border-[#E8D7BE] bg-gradient-to-b from-white to-[#FFF6E8] p-2 text-center">
      <span className="text-[1.75rem] leading-none">{emoji}</span>
      <span className="mt-1 w-full truncate text-[0.6875rem] font-black">{name}</span>
      {sub && <span className="text-[0.5625rem] font-bold text-mute">{sub}</span>}
      <span className="absolute right-1 top-1 rounded-full bg-ink px-1.5 text-[0.625rem] font-black text-white">{n}</span>
    </div>
  )
  const empty = (t: string) => <p className="col-span-full py-8 text-center text-[0.8125rem] font-semibold text-sub">{t}</p>
  const stats: [string, string, number][] = [
    ['🌱', '씨앗 심은 횟수', w.counters.planted ?? 0],
    ['🧺', '수확한 작물', w.counters.harvested ?? 0],
    ['🍳', '공방에서 만든 횟수', w.counters.crafted ?? 0],
    ['🏪', '가게 영업일', w.counters.shopDays ?? 0],
    ['💼', '출근한 날', w.counters.workDays ?? 0],
    ['📚', '들은 레슨', w.counters.lessons ?? 0],
    ['📑', '받은 지원금', w.counters.grants ?? 0],
    ['👀', '이웃 가게 방문', w.counters.rivalVisits ?? 0],
  ]
  return (
    <Panel
      title="가방"
      icon="🎒"
      color="#C98B4F"
      wide
      onClose={onClose}
      tabs={
        <Tabs<BagTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'items', label: '🥬 작물·재료' },
            { id: 'seeds', label: '🌱 씨앗' },
            ...(g.started ? [{ id: 'stock' as BagTab, label: '📦 가게 재고' }] : []),
            { id: 'record', label: '📊 내 기록' },
          ]}
        />
      }
      footer={
        <p className="text-[0.75rem] font-semibold text-sub">
          🪙 {won(w.cash)}원 {w.loan > 0 && `· 대출 ${won(w.loan)}원`} · Lv
          {levelOf(w.exp).level} · EXP {w.exp.toLocaleString()}
        </p>
      }
    >
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {tab === 'items' &&
          (items.length
            ? items.map(([id, n]) => <Tile key={id} emoji={itemInfo(id).emoji} name={itemInfo(id).name} n={n} sub={`${itemInfo(id).price.toLocaleString()}원`} />)
            : empty('비어 있어요. 텃밭에서 수확하거나 도매시장에서 사 오세요.'))}
        {tab === 'seeds' &&
          (seeds.length
            ? seeds.map((c) => <Tile key={c.id} emoji={c.emoji} name={`${c.name} 씨앗`} n={w.seeds[c.id]} sub={c.paddy ? '논' : '밭'} />)
            : empty('씨앗이 없어요. 도매시장에서 사 오세요.'))}
        {tab === 'stock' &&
          g.products.map((p) => <Tile key={p.id} emoji={p.emoji} name={p.name} n={w.stock[p.id] ?? 0} sub={p.kind === 'service' ? '서비스' : p.perishable ? '당일 판매' : '보관 가능'} />)}
      </div>
      {tab === 'record' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([e, l, n]) => (
            <Card key={l} className="flex items-center gap-2">
              <span className="text-[1.5rem]">{e}</span>
              <span>
                <span className="block text-[1.125rem] font-black leading-none">{n.toLocaleString()}</span>
                <span className="text-[0.6875rem] font-bold text-sub">{l}</span>
              </span>
            </Card>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ───────── 설정 ───────── */
export function SettingsPanel({ onClose, onCharacter }: { onClose: () => void; onCharacter: () => void }) {
  const w = useWorld()
  const g = useGame()
  const app = useApp()
  const [name, setName] = useState(w.name)
  const [confirm, setConfirm] = useState(false)
  return (
    <Panel title="설정" icon="⚙️" color="#4B4F7A" wide onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <Turntable look={toLook(w.avatar, w.path === 'employee' ? 'employee' : 'owner')} size={130} controls={false} />
          <GameButton size="sm" tone="violet" onClick={onCharacter}>
            🎨 캐릭터 꾸미기 · 시트
          </GameButton>
          <div className="flex gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={8}
              className="h-9 w-28 rounded-xl border-2 border-black/10 bg-white px-2 text-[0.875rem] font-black outline-none focus:border-primary"
            />
            <GameButton size="sm" disabled={!name.trim() || name === w.name} onClick={() => (w.setAvatar({}, name.trim()), toast('이름을 바꿨어요'))}>
              저장
            </GameButton>
          </div>
        </div>
        <div className="grid content-start gap-2 sm:grid-cols-2">
          <Card>
            <p className="text-[0.8125rem] font-black">🔊 듣기 모드 속도</p>
            <div className="mt-1.5 flex gap-1">
              {[0.8, 1, 1.2, 1.4].map((r) => (
                <button
                  key={r}
                  onClick={() => app.updateSettings({ speechRate: r })}
                  className={cx('h-8 flex-1 rounded-xl text-[0.75rem] font-black', app.settings.speechRate === r ? 'bg-ink text-white' : 'bg-black/5')}
                >
                  {r}×
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[0.8125rem] font-black">🎵 소리</p>
            <div className="mt-1.5 flex gap-1.5">
              {(
                [
                  ['bgm', '🎼 배경음악'],
                  ['sfx', '🔔 효과음'],
                ] as const
              ).map(([k, label]) => {
                const on = app.settings[k] !== false
                return (
                  <button
                    key={k}
                    onClick={() => {
                      app.updateSettings({ [k]: !on })
                      setAudio({ [k]: !on })
                      if (k === 'sfx' && !on) sfx('pop')
                    }}
                    aria-pressed={on}
                    className={cx(
                      'flex h-9 flex-1 items-center justify-center gap-1 rounded-xl text-[0.75rem] font-black transition',
                      on ? 'bg-gradient-to-b from-[#9B87FF] to-violet text-white shadow' : 'bg-black/5 text-sub',
                    )}
                  >
                    {label} {on ? 'ON' : 'OFF'}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-[0.625rem] font-semibold text-mute">잔잔한 오르골 음악 · 낮엔 새소리, 밤엔 풀벌레 소리가 들려요.</p>
          </Card>
          <Card>
            <label className="flex items-center justify-between gap-2">
              <span>
                <span className="block text-[0.8125rem] font-black">⚡ 체험 모드 (빠르게)</span>
                <span className="block text-[0.6875rem] font-semibold text-sub">작물·제작 시간 10배 빠르게, 하루 영업·출근 제한 없음. 처음 둘러볼 때 좋아요.</span>
              </span>
              <input
                type="checkbox"
                checked={w.fast}
                onChange={(e) => {
                  w.setFast(e.target.checked)
                  g.setFastPlay(e.target.checked)
                }}
                className="size-5 accent-primary"
              />
            </label>
          </Card>
          <Card>
            <p className="text-[0.8125rem] font-black">🗺️ 내 동네</p>
            <p className="text-[0.75rem] font-semibold text-sub">
              {w.region.sido} {w.region.gu} {w.region.dong}
            </p>
            {confirm ? (
              <div className="mt-2 flex gap-1.5">
                <GameButton size="sm" tone="white" onClick={() => setConfirm(false)}>
                  취소
                </GameButton>
                <GameButton
                  size="sm"
                  tone="coral"
                  onClick={() => {
                    useWorld.getState().reset()
                    useGame.getState().resetGame()
                    useApp.getState().resetAll()
                    onClose()
                  }}
                >
                  모두 지우기
                </GameButton>
              </div>
            ) : (
              <GameButton size="sm" tone="white" className="mt-2" onClick={() => setConfirm(true)}>
                <RotateCcw className="size-3.5" /> 처음부터 다시 하기
              </GameButton>
            )}
          </Card>
        </div>
      </div>
    </Panel>
  )
}

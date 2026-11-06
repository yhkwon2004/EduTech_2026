import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { DayResult } from '@/game/types'
import { useGame } from '@/game/store'
import { REPLY_QUIZ, WEATHER } from '@/game/data'
import { RankChange, Stars } from '@/game/ui'
import { LESSON_MAP } from '@/data/courses'
import { todayKey } from '@/lib/date'
import { answerShopReply } from '../actions'
import { Card, Chip, cx, GameButton, Panel, Tabs, toast, won } from '../ui/kit'

type Tab = 'money' | 'rank' | 'review'

function SeasonEndCard() {
  const g = useGame()
  const s = g.seasonEnd
  if (!s) return null
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[#101233]/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[26rem] animate-pop rounded-3xl border-[3px] border-[#1B1D45] bg-gradient-to-b from-[#FFF8DC] to-[#FFE7A0] p-4 text-center shadow-2xl">
        <p className="text-[2.75rem] leading-none">{s.champion ? '👑' : s.rank === 1 ? '🏆' : s.promoted ? '🚀' : '🎖️'}</p>
        <p className="mt-1 text-[0.75rem] font-black text-[#8A6508]">
          시즌 {s.season} 종료 · {s.league}
        </p>
        <p className="text-[1.375rem] font-black">최종 {s.rank}위</p>
        {s.title && <p className="mt-1 inline-block rounded-full bg-ink px-3 py-1 text-[0.8125rem] font-black text-white">🏅 {s.title}</p>}
        <p className="mt-1.5 text-[0.8125rem] font-bold text-ink/80">
          {s.champion ? '지역 최고의 소상공인이 됐어요! 명예의 전당에 이름이 올랐어요.' : s.promoted ? '축하해요! 다음 시즌부터 더 넓은 리그에서 겨뤄요.' : '7일 동안 수고했어요. 다음 시즌엔 TOP 3에 도전해 봐요!'}
        </p>
        <GameButton tone="green" className="mt-3" onClick={() => g.dismissSeason()}>
          다음 시즌으로
        </GameButton>
      </div>
    </div>
  )
}

function ReplyGame({ day }: { day: number }) {
  const g = useGame()
  const quiz = REPLY_QUIZ[day % REPLY_QUIZ.length]
  const [picked, setPicked] = useState<number | null>(null)
  const done = g.replyDay === todayKey() && picked === null
  if (done) return <p className="rounded-2xl bg-black/[0.03] p-2.5 text-[0.75rem] font-semibold text-sub">오늘 리뷰 답글은 이미 달았어요. 내일 또 만나요!</p>
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#FFF0F3] to-[#FFE0E7] p-2.5">
      <p className="text-[0.6875rem] font-black text-coral">💬 리뷰 답글 달기 (하루 1번 · 맞히면 평판 UP)</p>
      <p className="mt-0.5 text-[0.875rem] font-black">"{quiz.review}"</p>
      <div className="mt-1.5 space-y-1">
        {quiz.options.map((o, i) => (
          <button
            key={i}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i)
              answerShopReply(i === quiz.answer)
              toast(i === quiz.answer ? '좋은 답글이에요! 평판 +0.03' : '조금 아쉬운 답글이에요', i === quiz.answer ? 'good' : 'bad')
            }}
            className={cx(
              'block w-full rounded-xl border-2 px-2.5 py-1.5 text-left text-[0.75rem] font-bold',
              picked === null ? 'border-transparent bg-white' : i === quiz.answer ? 'border-teal bg-teal-50' : picked === i ? 'border-coral bg-coral-50' : 'border-transparent bg-white opacity-60',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && <p className="mt-1 text-[0.6875rem] font-bold text-ink/80">💡 {quiz.explain}</p>}
    </div>
  )
}

export function ResultPanel({ result: r, onClose, openLesson }: { result: DayResult; onClose: () => void; openLesson: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>('money')
  const g = useGame()
  const totalCost = r.costs.ingredients + r.costs.marketing + r.costs.wages + r.costs.rent + r.costs.delivery
  const wx = WEATHER[r.weather]
  const me = r.table.find((t) => t.isPlayer)
  return (
    <Panel
      title={`${r.day}일차 영업 결과`}
      icon={r.profit >= 0 ? '💰' : '📉'}
      color={r.profit >= 0 ? '#2E9C6A' : '#C8423B'}
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'money', label: '💵 돈의 흐름' },
            { id: 'rank', label: '🏆 동네 순위' },
            { id: 'review', label: '⭐ 리뷰·배울 점', badge: g.replyDay !== todayKey() ? 1 : 0 },
          ]}
        />
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.75rem] font-semibold text-sub">
            {wx.emoji} {wx.label} · 손님 {r.customers}명 {r.lostCustomers > 0 && `(놓친 손님 ${r.lostCustomers}명)`} · +{r.xpGained} 가게 XP
          </span>
          <GameButton size="sm" tone="green" onClick={onClose}>
            마을로 돌아가기
          </GameButton>
        </div>
      }
    >
      <div className="relative h-full">
        {tab === 'money' && (
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
            <div className={cx('flex flex-col items-center justify-center rounded-3xl p-4 text-center', r.profit >= 0 ? 'bg-gradient-to-br from-[#E6F7EE] to-[#C9EEDA]' : 'bg-gradient-to-br from-[#FFECEA] to-[#FFD3CF]')}>
              <p className="text-[0.75rem] font-black text-sub">오늘 남은 돈 (이익)</p>
              <p className={cx('text-[2.25rem] font-black leading-tight', r.profit >= 0 ? 'text-teal' : 'text-coral')}>{won(r.profit, { sign: true })}원</p>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                <Chip tone="blue">하루 {r.rank}위</Chip>
                <Chip tone="sun">점수 {r.score}</Chip>
                <Chip tone="violet">점유율 {Math.round(r.share * 100)}%</Chip>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[0.75rem] font-bold">
                평판 <Stars value={r.reputation} size={12} /> {r.reputation >= r.reputationBefore ? '▲' : '▼'} · 인지도 {Math.round(r.awareness)}
              </p>
            </div>
            <div className="space-y-2">
              <Card>
                <p className="flex justify-between text-[0.875rem] font-black">
                  <span>매출</span>
                  <span className="text-primary">+{r.revenue.toLocaleString()}원</span>
                </p>
                <div className="mt-1 space-y-0.5 text-[0.75rem] font-semibold text-sub">
                  {(
                    [
                      ['재료비 (원가)', r.costs.ingredients],
                      ['홍보비', r.costs.marketing],
                      ['인건비', r.costs.wages],
                      ['임대료', r.costs.rent],
                      ['배달 수수료', r.costs.delivery],
                    ] as const
                  )
                    .filter(([, v]) => v > 0)
                    .map(([l, v]) => (
                      <p key={l} className="flex justify-between">
                        <span>{l}</span>
                        <span>-{v.toLocaleString()}원</span>
                      </p>
                    ))}
                  <p className="flex justify-between border-t border-black/10 pt-0.5 font-black text-ink">
                    <span>비용 합계</span>
                    <span>-{totalCost.toLocaleString()}원</span>
                  </p>
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {r.products.map((p) => (
                  <div key={p.id} className="rounded-2xl border-2 border-black/5 bg-white p-2">
                    <p className="truncate text-[0.75rem] font-black">
                      {p.emoji} {p.name}
                    </p>
                    <p className="text-[0.6875rem] font-bold text-sub">
                      판매 {p.sold}
                      {p.made > 0 && `/${p.made}`} · 수요 {p.demand}
                    </p>
                    {p.made > 0 && p.sold >= p.made && p.demand > p.made && <Chip tone="coral">품절!</Chip>}
                    {p.wasted > 0 && <Chip tone="sun">폐기 {p.wasted}</Chip>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'rank' && (
          <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
            <div className="space-y-1">
              {r.table.map((t) => (
                <div key={t.id} className={cx('flex items-center gap-2 rounded-xl px-2.5 py-1.5', t.isPlayer ? 'bg-primary-50 ring-2 ring-primary' : 'bg-black/[0.03]')}>
                  <span className={cx('grid size-6 place-items-center rounded-full text-[0.6875rem] font-black', t.rank <= 3 ? 'bg-sun' : 'bg-black/5')}>{t.rank}</span>
                  <span className="text-[1.125rem]">{t.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-black">{t.name}</span>
                  <span className="hidden text-[0.6875rem] font-bold text-sub sm:inline">손님 {t.customers}</span>
                  <span className="w-16 text-right text-[0.75rem] font-bold">{won(t.profit, { sign: true })}</span>
                  <span className="w-10 text-right text-[0.8125rem] font-black">{t.score}</span>
                </div>
              ))}
            </div>
            <Card>
              <p className="text-[0.8125rem] font-black">
                오늘 {r.rank}위 <RankChange now={r.rank} prev={r.prevRank} />
              </p>
              <div className="mt-1.5 space-y-1 text-[0.75rem] font-bold">
                {(
                  [
                    ['💵 이익', r.scoreParts.profit],
                    ['⭐ 평판', r.scoreParts.reputation],
                    ['🥧 점유율', r.scoreParts.share],
                    ['📈 성장', r.scoreParts.growth],
                  ] as const
                ).map(([l, v]) => (
                  <p key={l} className="flex justify-between">
                    <span>{l}</span>
                    <span>{v}</span>
                  </p>
                ))}
              </div>
              {me && <p className="mt-1.5 text-[0.6875rem] font-semibold text-sub">점수 = 이익 + 평판 + 손님 점유율 + 어제보다 나아진 정도. 많이 파는 것보다 "잘" 파는 게 중요해요.</p>}
            </Card>
          </div>
        )}

        {tab === 'review' && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[0.8125rem] font-black">손님 리뷰</p>
              {r.reviews.map((rv, i) => (
                <div key={i} className={cx('rounded-2xl p-2', rv.tone === 'good' ? 'bg-teal-50' : rv.tone === 'bad' ? 'bg-coral-50' : 'bg-black/[0.03]')}>
                  <Stars value={rv.stars} size={11} />
                  <p className="text-[0.8125rem] font-bold">{rv.text}</p>
                </div>
              ))}
              <ReplyGame day={r.day} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[0.8125rem] font-black">📌 오늘 배울 점</p>
              {r.eventNote && <p className="rounded-2xl bg-sun-50 p-2 text-[0.75rem] font-bold text-[#8A6508]">{r.eventNote}</p>}
              {r.tips.map((t, i) => (
                <Card key={i} className="py-2">
                  <p className="text-[0.8125rem] font-semibold">{t.text}</p>
                  {t.lessonId && LESSON_MAP[t.lessonId] && (
                    <button onClick={() => openLesson(t.lessonId!)} className="mt-1 flex items-center gap-1 text-[0.75rem] font-black text-primary">
                      <BookOpen className="size-3.5" /> {LESSON_MAP[t.lessonId].title} ({LESSON_MAP[t.lessonId].minutes}분)
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
        <SeasonEndCard />
      </div>
    </Panel>
  )
}

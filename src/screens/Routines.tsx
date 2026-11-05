import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { RoutineTemplate, SlotId, TaskTag } from '@/types'
import { useApp } from '@/store/app'
import { ROUTINES, SLOTS, TAG_META, defaultOn } from '@/data/routines'
import { BIZ_LABEL } from '@/data/categories'
import { WEEKDAY_KO } from '@/lib/date'
import { Icon } from '@/components/Icon'
import { cx, PrimaryButton, Segmented, Sheet, Toggle, TopBar } from '@/components/ui'

export function Routines() {
  const biz = useApp((s) => s.profile.bizType)
  const on = useApp((s) => s.routineOn)
  const off = useApp((s) => s.routineOff)
  const weekdays = useApp((s) => s.routineWeekday)
  const custom = useApp((s) => s.customRoutines)
  const setEnabled = useApp((s) => s.setRoutineEnabled)
  const setWeekday = useApp((s) => s.setRoutineWeekday)
  const deleteCustom = useApp((s) => s.deleteCustomRoutine)
  const [adding, setAdding] = useState(false)

  const all: RoutineTemplate[] = [...ROUTINES, ...custom]
  const isOn = (r: RoutineTemplate) => (r.custom ? !off.includes(r.id) : defaultOn(r, biz) ? !off.includes(r.id) : on.includes(r.id))
  const count = all.filter(isOn).length

  return (
    <div className="min-h-dvh pb-10">
      <TopBar
        title="루틴 관리"
        right={
          <button onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-full bg-primary px-3.5 text-[0.8125rem] font-bold text-white shadow-float">
            <Plus className="size-4" /> 루틴 추가
          </button>
        }
      />
      <p className="px-5 text-[0.875rem] leading-relaxed text-sub">
        매일·매주·매월 반복되는 가게 일을 켜 두면 <b className="text-ink">오늘 할 일</b>에 시간대별로 나와요. {BIZ_LABEL[biz]}에 맞는 것을 먼저 켜 두었어요. 지금{' '}
        <b className="text-primary">{count}개</b> 켜져 있어요.
      </p>

      <div className="mt-4 space-y-5 px-5">
        {SLOTS.map((s) => {
          const list = all.filter((r) => r.slot === s.id)
          if (!list.length) return null
          return (
            <section key={s.id}>
              <p className="mb-2 flex items-center gap-1.5 px-1 text-[0.875rem] font-extrabold">
                <Icon name={s.icon} className="size-4 text-primary" />
                {s.label}
                <span className="font-semibold text-mute">· {s.hint}</span>
              </p>
              <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-card">
                {list.map((r, i) => {
                  const enabled = isOn(r)
                  const tag = TAG_META[r.tag]
                  const wd = weekdays[r.id] ?? r.weekday ?? 1
                  return (
                    <div key={r.id} className={cx('px-4 py-3', i > 0 && 'border-t border-line')}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: tag.soft, color: tag.color }}>
                          <Icon name={tag.icon} className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cx('text-[0.9375rem] font-bold leading-snug', !enabled && 'text-mute')}>{r.title}</p>
                          <p className="text-[0.71875rem] font-semibold text-mute">
                            {r.freq === 'daily' ? '매일' : r.freq === 'weekly' ? `매주 ${WEEKDAY_KO[wd]}요일` : `매월 ${r.monthDay ?? 1}일`}
                            {r.minutes > 0 && ` · ${r.minutes}분`}
                            {r.bizTypes && !r.custom && ` · ${r.bizTypes.map((b) => BIZ_LABEL[b]).join('·')} 추천`}
                            {r.custom && ' · 직접 만듦'}
                          </p>
                        </div>
                        {r.custom && (
                          <button aria-label="루틴 삭제" onClick={() => deleteCustom(r.id)} className="grid size-8 place-items-center rounded-full text-coral">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                        <Toggle checked={enabled} onChange={(v) => setEnabled(r.id, v)} label={`${r.title} 켜기`} />
                      </div>
                      {r.freq === 'weekly' && enabled && (
                        <div className="mt-2.5 flex gap-1 pl-12">
                          {WEEKDAY_KO.map((w, n) => (
                            <button
                              key={w}
                              onClick={() => setWeekday(r.id, n)}
                              aria-pressed={wd === n}
                              className={cx(
                                'size-8 rounded-full text-[0.75rem] font-bold transition',
                                wd === n ? 'bg-primary text-white' : 'bg-bg text-sub',
                              )}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {adding && <AddRoutineSheet onClose={() => setAdding(false)} />}
    </div>
  )
}

const TAG_CHOICES: TaskTag[] = ['ops', 'hygiene', 'service', 'marketing', 'digital', 'tax', 'labor', 'safety', 'care']

function AddRoutineSheet({ onClose }: { onClose: () => void }) {
  const add = useApp((s) => s.addCustomRoutine)
  const [title, setTitle] = useState('')
  const [slot, setSlot] = useState<SlotId>('break')
  const [freq, setFreq] = useState<RoutineTemplate['freq']>('daily')
  const [weekday, setWeekday] = useState(1)
  const [monthDay, setMonthDay] = useState(1)
  const [minutes, setMinutes] = useState(5)
  const [tag, setTag] = useState<TaskTag>('ops')
  const valid = title.trim().length >= 2

  return (
    <Sheet
      open
      onClose={onClose}
      title="루틴 추가"
      footer={
        <PrimaryButton
          arrow={false}
          disabled={!valid}
          onClick={() => {
            add({
              title: title.trim(),
              slot,
              freq,
              minutes,
              tag,
              weekday: freq === 'weekly' ? weekday : undefined,
              monthDay: freq === 'monthly' ? monthDay : undefined,
            })
            onClose()
          }}
        >
          추가하기
        </PrimaryButton>
      }
    >
      <label className="block">
        <span className="text-[0.8125rem] font-bold text-sub">할 일</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={40}
          placeholder="예: 커피머신 청소"
          className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none ring-primary placeholder:text-mute focus:ring-2"
        />
      </label>

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">시간대</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSlot(s.id)}
            aria-pressed={slot === s.id}
            className={cx('flex items-center justify-center gap-1 rounded-2xl py-2.5 text-[0.8125rem] font-bold', slot === s.id ? 'bg-primary text-white' : 'bg-bg text-ink')}
          >
            <Icon name={s.icon} className="size-4" />
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">반복</p>
      <div className="mt-1.5">
        <Segmented<RoutineTemplate['freq']>
          value={freq}
          onChange={setFreq}
          options={[
            { value: 'daily', label: '매일' },
            { value: 'weekly', label: '매주' },
            { value: 'monthly', label: '매월' },
          ]}
        />
      </div>
      {freq === 'weekly' && (
        <div className="mt-2.5 flex justify-between">
          {WEEKDAY_KO.map((w, n) => (
            <button
              key={w}
              onClick={() => setWeekday(n)}
              aria-pressed={weekday === n}
              className={cx('size-10 rounded-full text-[0.875rem] font-bold', weekday === n ? 'bg-primary text-white' : 'bg-bg text-sub')}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {freq === 'monthly' && (
        <label className="mt-2.5 flex items-center gap-2 text-[0.9375rem] font-bold">
          매월
          <select value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className="h-11 rounded-xl bg-bg px-3 font-bold outline-none">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          일
        </label>
      )}

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">걸리는 시간</p>
      <div className="mt-1.5">
        <Segmented<number> value={minutes} onChange={setMinutes} options={[1, 5, 10, 20, 30].map((m) => ({ value: m, label: `${m}분` }))} />
      </div>

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">분류</p>
      <div className="mt-1.5 flex flex-wrap gap-2 pb-2">
        {TAG_CHOICES.map((t) => {
          const m = TAG_META[t]
          const sel = tag === t
          return (
            <button
              key={t}
              onClick={() => setTag(t)}
              aria-pressed={sel}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-bold"
              style={sel ? { background: m.color, color: 'white' } : { background: m.soft, color: m.color }}
            >
              <Icon name={m.icon} className="size-3.5" />
              {m.name}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

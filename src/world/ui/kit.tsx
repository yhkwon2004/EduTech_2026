import { useEffect, type ReactNode } from 'react'
import { create } from 'zustand'
import { Minus, Plus, X } from 'lucide-react'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type Tone = 'primary' | 'coral' | 'green' | 'sun' | 'ink' | 'white' | 'violet'
const TONE: Record<Tone, string> = {
  primary: 'bg-gradient-to-b from-[#4C94FF] to-primary text-white border-primary-700',
  coral: 'bg-gradient-to-b from-[#FF7F78] to-coral text-white border-[#C8423B]',
  green: 'bg-gradient-to-b from-[#5FCB6D] to-leaf text-white border-[#2D7F39]',
  sun: 'bg-gradient-to-b from-[#FFDD70] to-sun text-ink border-[#D9A520]',
  ink: 'bg-gradient-to-b from-[#3B3E73] to-ink text-white border-[#111233]',
  white: 'bg-white text-ink border-line',
  violet: 'bg-gradient-to-b from-[#9B87FF] to-violet text-white border-[#5A41D9]',
}

export function GameButton({
  children,
  onClick,
  tone = 'primary',
  disabled,
  className,
  size = 'md',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  tone?: Tone
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
}) {
  const sz = size === 'sm' ? 'h-8 px-3 text-[0.75rem] rounded-xl' : size === 'lg' ? 'h-12 px-6 text-[1rem] rounded-2xl' : 'h-10 px-4 text-[0.875rem] rounded-2xl'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'btn-game inline-flex items-center justify-center gap-1.5 border-b-[3px] font-extrabold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
        sz,
        TONE[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Bar({ value, color = 'bg-primary', className, track = 'bg-black/10' }: { value: number; color?: string; className?: string; track?: string }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full', track, className)}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, max = 9999, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button aria-label="줄이기" onClick={() => onChange(Math.max(min, value - step))} className="grid size-7 place-items-center rounded-lg bg-black/5 active:scale-90">
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || 0))))}
        className={cx("rounded-lg bg-black/5 py-1 text-center text-[0.875rem] font-extrabold tabular-nums outline-none", value >= 10000 ? "w-[4.5rem]" : "w-14")}
      />
      <button aria-label="늘리기" onClick={() => onChange(Math.min(max, value + step))} className="grid size-7 place-items-center rounded-lg bg-black/5 active:scale-90">
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: ReactNode; badge?: number }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-black/10 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-pressed={value === t.id}
          className={cx(
            'relative flex h-8 items-center gap-1 rounded-xl px-3 text-[0.8125rem] font-extrabold whitespace-nowrap transition',
            value === t.id ? 'bg-white text-ink shadow' : 'text-white/90 hover:bg-white/10',
          )}
        >
          {t.label}
          {!!t.badge && <span className="grid min-w-4 place-items-center rounded-full bg-coral px-1 text-[0.625rem] text-white">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

/** 건물 안 창 — 가로 화면용 큰 패널 */
export function Panel({
  title,
  icon,
  color = '#176FF2',
  onClose,
  tabs,
  children,
  wide,
  footer,
}: {
  title: ReactNode
  icon?: ReactNode
  color?: string
  onClose: () => void
  tabs?: ReactNode
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-2 sm:p-3" role="dialog" aria-modal="true">
      <button aria-label="닫기" className="absolute inset-0 animate-fade-in bg-[#101233]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx('relative flex h-full max-h-[33rem] w-full animate-panel flex-col overflow-hidden rounded-[1.5rem] border-[3px] border-[#1B1D45]/80 bg-[#FFFDF7] shadow-2xl', wide ? 'max-w-[60rem]' : 'max-w-[46rem]')}
      >
        <div className="flex shrink-0 items-center gap-2.5 px-3.5 py-2" style={{ background: `linear-gradient(180deg, ${color}, ${color}DD)` }}>
          {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/25 text-[1.25rem] ring-2 ring-white/40">{icon}</span>}
          <h2 className="min-w-0 shrink-0 truncate text-[1.0625rem] font-black text-white drop-shadow">{title}</h2>
          <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">{tabs}</div>
          <button aria-label="닫기" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/25 text-white ring-2 ring-white/40 active:scale-90">
            <X className="size-5" strokeWidth={3} />
          </button>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        {footer && <div className="shrink-0 border-t-2 border-black/5 bg-white/70 px-3 py-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={cx('block rounded-2xl border-2 border-black/5 bg-white p-3 text-left shadow-sm', onClick && 'transition active:scale-[0.98]', className)}>
      {children}
    </C>
  )
}

export function Chip({ children, tone = 'mute' }: { children: ReactNode; tone?: 'mute' | 'blue' | 'green' | 'coral' | 'sun' | 'violet' }) {
  const m = {
    mute: 'bg-black/5 text-sub',
    blue: 'bg-primary-50 text-primary',
    green: 'bg-teal-50 text-teal',
    coral: 'bg-coral-50 text-coral',
    sun: 'bg-sun-50 text-[#B7860B]',
    violet: 'bg-violet-50 text-violet',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-extrabold whitespace-nowrap', m[tone])}>{children}</span>
}

/* ───────── 토스트 (+EXP, 레벨업) ───────── */

interface Toast {
  id: number
  text: string
  tone: 'good' | 'bad' | 'level' | 'info'
}
export const useToasts = create<{ list: Toast[]; push: (text: string, tone?: Toast['tone']) => void }>((set, get) => ({
  list: [],
  push: (text, tone = 'good') => {
    const id = Date.now() + Math.random()
    set({ list: [...get().list.slice(-3), { id, text, tone }] })
    setTimeout(() => set({ list: get().list.filter((t) => t.id !== id) }), tone === 'level' ? 2600 : 1800)
  },
}))

export function toast(text: string, tone?: Toast['tone']) {
  useToasts.getState().push(text, tone)
}

export function Toasts() {
  const list = useToasts((s) => s.list)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.25rem] z-50 flex flex-col-reverse items-center gap-1.5">
      {list.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-pop rounded-full border-2 px-4 py-1.5 text-[0.875rem] font-black shadow-lg',
            t.tone === 'good' && 'border-white bg-teal text-white',
            t.tone === 'bad' && 'border-white bg-coral text-white',
            t.tone === 'info' && 'border-white bg-ink text-white',
            t.tone === 'level' && 'border-white bg-gradient-to-r from-sun to-orange px-6 py-2.5 text-[1.125rem] text-ink',
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function won(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : n < 0 ? '-' : ''
  const a = Math.abs(Math.round(n))
  if (a >= 100000000) return `${sign}${(a / 100000000).toFixed(1).replace(/\.0$/, '')}억`
  if (a >= 10000) return `${sign}${(a / 10000).toFixed(a >= 1000000 ? 0 : 1).replace(/\.0$/, '')}만`
  return `${sign}${a.toLocaleString('ko-KR')}`
}

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m}분 ${String(s % 60).padStart(2, '0')}초` : `${s}초`
}

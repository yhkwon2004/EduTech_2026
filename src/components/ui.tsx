import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, X } from 'lucide-react'
import type { CategoryId } from '@/types'
import { CATEGORY_MAP } from '@/data/categories'
import { Icon } from './Icon'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/** 뒤로가기 + 제목 (EDUPRO 스타일) */
export function TopBar({
  title,
  right,
  onBack,
  transparent,
}: {
  title?: ReactNode
  right?: ReactNode
  onBack?: () => void
  transparent?: boolean
}) {
  const nav = useNavigate()
  return (
    <header
      className={cx(
        'pt-safe sticky top-0 z-30',
        transparent ? 'bg-transparent' : 'bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <button
          aria-label="뒤로"
          onClick={() => (onBack ? onBack() : history.length > 1 ? nav(-1) : nav('/'))}
          className="-ml-1 grid size-10 place-items-center rounded-full text-ink hover:bg-white/70 active:scale-95"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[1.1875rem] font-bold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  )
}

export function SectionHeader({ title, action, onAction }: { title: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <h2 className="text-[1.1875rem] font-bold tracking-tight text-ink">{title}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-0.5 text-[0.8125rem] font-bold text-primary">
          {action}
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={cx('block w-full rounded-[20px] bg-white text-left shadow-card', onClick && 'active:scale-[0.99] transition', className)}>
      {children}
    </C>
  )
}

/** 알약형 탭/필터 (Aspen) */
export function Chip({
  active,
  children,
  onClick,
  tone = 'primary',
  size = 'md',
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  tone?: 'primary' | 'teal'
  size?: 'sm' | 'md'
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 rounded-full font-semibold transition active:scale-95',
        size === 'sm' ? 'px-3.5 py-1.5 text-[0.8125rem]' : 'px-4.5 py-2.5 text-[0.875rem]',
        active
          ? tone === 'teal'
            ? 'bg-teal text-white'
            : 'bg-primary-50 text-primary ring-1 ring-primary/15'
          : 'bg-white text-sub ring-1 ring-line hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

/** EDUPRO 스타일: 파란 버튼 + 오른쪽 흰 원 화살표 */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  arrow = true,
  tone = 'primary',
  type = 'button',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  arrow?: boolean
  tone?: 'primary' | 'coral' | 'ink'
  type?: 'button' | 'submit'
  className?: string
}) {
  const bg = tone === 'coral' ? 'bg-coral shadow-[0_10px_30px_rgba(248,55,88,0.3)]' : tone === 'ink' ? 'bg-ink' : 'bg-primary shadow-float'
  const fg = tone === 'coral' ? 'text-coral' : tone === 'ink' ? 'text-ink' : 'text-primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'relative flex h-[3.75rem] w-full items-center justify-center rounded-full px-16 text-[1.0625rem] font-bold text-white transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none',
        bg,
        className,
      )}
    >
      {children}
      {arrow && (
        <span className={cx('absolute right-2 grid size-11 place-items-center rounded-full bg-white', fg)}>
          <ArrowRight className="size-5" strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}

export function GhostButton({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cx('flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-white text-[0.9375rem] font-bold text-ink ring-1 ring-line active:scale-[0.98]', className)}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, className, color = 'bg-primary' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 72,
  stroke = 8,
  color = '#176FF2',
  track = '#E8EDF5',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

/** 아래에서 올라오는 시트 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-center" role="dialog" aria-modal="true">
      <button aria-label="닫기" className="absolute inset-0 animate-fade-in bg-ink/40" onClick={onClose} />
      <div className="absolute bottom-0 flex max-h-[92dvh] w-full max-w-[440px] animate-sheet-up flex-col rounded-t-[28px] bg-white">
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <span className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-3">
            <h3 className="text-[1.1875rem] font-bold">{title}</h3>
            <button aria-label="닫기" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-bg text-sub">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe-4 border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-line')}
    >
      <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-full bg-bg p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            'h-10 flex-1 rounded-full text-[0.875rem] font-bold transition',
            value === o.value ? 'bg-white text-primary shadow-card' : 'text-sub',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-primary-50 text-primary">{icon}</div>
      <p className="text-[1rem] font-bold">{title}</p>
      {body && <p className="mt-1.5 text-[0.875rem] leading-relaxed text-sub">{body}</p>}
      {action && <div className="mt-5 w-full max-w-[240px]">{action}</div>}
    </div>
  )
}

export function CategoryTag({ id, className }: { id: CategoryId; className?: string }) {
  const c = CATEGORY_MAP[id]
  return (
    <span className={cx('text-[0.75rem] font-bold', className)} style={{ color: c.color }}>
      {c.name}
    </span>
  )
}

/** 코스 썸네일 — 사진 대신 카테고리 그라디언트 + 일러스트 */
export function Thumb({
  category,
  className,
  iconSize = 44,
  children,
}: {
  category: CategoryId
  className?: string
  iconSize?: number
  children?: ReactNode
}) {
  const c = CATEGORY_MAP[category]
  return (
    <div className={cx('relative overflow-hidden', className)} style={{ background: c.gradient }}>
      <span className="absolute -right-6 -top-8 size-28 rounded-full bg-white/15" />
      <span className="absolute -bottom-10 -left-4 size-24 rounded-full bg-white/10" />
      <span className="absolute bottom-3 right-10 size-3 rounded-full bg-white/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid place-items-center rounded-[22px] bg-white/20 p-3 ring-1 ring-white/30 backdrop-blur-sm">
          <Icon name={c.icon} color="white" size={iconSize} strokeWidth={1.8} />
        </div>
      </div>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'coral' | 'teal' | 'sun' | 'mute' }) {
  const map = {
    primary: 'bg-primary-50 text-primary',
    coral: 'bg-coral-50 text-coral',
    teal: 'bg-teal-50 text-teal',
    sun: 'bg-sun-50 text-[#B7860B]',
    mute: 'bg-bg text-sub',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-bold', map[tone])}>{children}</span>
}

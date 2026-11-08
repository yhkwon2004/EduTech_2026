import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface Screen {
  width: number
  height: number
  rotated: boolean
  /** 화면(client) 좌표 → 게임 화면 좌표 */
  toLocal: (cx: number, cy: number) => { x: number; y: number }
}

const Ctx = createContext<Screen>({ width: 844, height: 390, rotated: false, toLocal: (x, y) => ({ x, y }) })

export function useScreen() {
  return useContext(Ctx)
}

function readViewport() {
  // 키보드가 올라와도 흔들리지 않게 창 크기를 기준으로 (visualViewport는 키보드만큼 줄어들어요)
  return { w: Math.round(window.innerWidth), h: Math.round(window.innerHeight) }
}

const isTextField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && ((el instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(el.type)) || el instanceof HTMLTextAreaElement)

/**
 * 가로형 게임 화면. 세로로 들고 있으면 화면 전체를 90° 돌려 가로로 보여 줘요.
 * (회전 잠금을 켜 둔 휴대폰도 옆으로 눕히면 바로 플레이)
 * 돌린 화면에서는 글자 입력이 어려워서, 입력칸을 누르면 바로 선 입력창(세로)을 띄워요.
 */
export function GameRoot({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(readViewport)
  const frozen = useRef(false)
  useEffect(() => {
    const on = () => {
      // 글자를 치는 동안(키보드) 크기 변화는 무시
      if (frozen.current || isTextField(document.activeElement)) return
      setVp(readViewport())
    }
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    // 키보드가 내려간 뒤 한 번 더
    const onBlur = () => window.setTimeout(on, 250)
    document.addEventListener('focusout', onBlur)
    // 가능하면 가로 고정 (전체화면이 아니면 거부되지만 해도 괜찮아요)
    const so = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation
    so?.lock?.('landscape').catch(() => {})
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
      document.removeEventListener('focusout', onBlur)
    }
  }, [])
  const rotated = vp.h > vp.w * 1.05
  const width = rotated ? vp.h : vp.w
  const height = rotated ? vp.w : vp.h
  const value = useMemo<Screen>(
    () => ({
      width,
      height,
      rotated,
      toLocal: rotated ? (cx, cy) => ({ x: cy, y: vp.w - cx }) : (cx, cy) => ({ x: cx, y: cy }),
    }),
    [width, height, rotated, vp.w],
  )
  const style: React.CSSProperties = rotated
    ? { position: 'fixed', top: 0, left: vp.w, width, height, transform: 'rotate(90deg)', transformOrigin: 'top left' }
    : { position: 'fixed', top: 0, left: 0, width, height }

  // ── 돌린 화면의 글자 입력: 세로(바로 선) 입력창으로
  const [sheet, setSheet] = useState<{ el: HTMLInputElement | HTMLTextAreaElement; value: string; label: string } | null>(null)
  const rootEl = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!rotated) return
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Element | null
      if (!isTextField(el) || !rootEl.current?.contains(el) || el.dataset.sheet === 'off') return
      el.blur()
      const label = el.getAttribute('placeholder') || el.getAttribute('aria-label') || '입력'
      frozen.current = true
      setSheet({ el, value: el.value, label })
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [rotated])
  const commit = (text: string | null) => {
    const s = sheet
    setSheet(null)
    frozen.current = false
    if (!s || text === null) return
    // React가 알아채도록 네이티브 setter로 값 넣고 input 이벤트
    const proto = s.el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    setter?.call(s.el, text)
    s.el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <Ctx.Provider value={value}>
      <div ref={rootEl} className="game-root" style={style}>
        {children}
      </div>
      {sheet &&
        createPortal(
          <InputSheet
            label={sheet.label}
            initial={sheet.value}
            multiline={sheet.el instanceof HTMLTextAreaElement}
            maxLength={sheet.el.maxLength > 0 ? sheet.el.maxLength : undefined}
            onDone={commit}
          />,
          document.body,
        )}
    </Ctx.Provider>
  )
}

/** 세로로 바로 선 입력창 (돌린 화면용) */
function InputSheet({ label, initial, multiline, maxLength, onDone }: { label: string; initial: string; multiline: boolean; maxLength?: number; onDone: (text: string | null) => void }) {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [])
  const cls = 'mt-2 w-full rounded-xl border-2 border-black/10 bg-white px-3 py-2.5 text-[1rem] font-bold text-ink outline-none focus:border-primary'
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) onDone(v)
    if (e.key === 'Escape') onDone(null)
  }
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#101233]/55 backdrop-blur-[3px]" style={{ fontFamily: 'var(--font-sans)' }}>
      <button aria-label="취소" className="flex-1" onClick={() => onDone(null)} />
      <div className="animate-panel rounded-t-[1.5rem] border-t-[3px] border-[#1B1D45]/80 bg-[#FFFDF7] p-4 shadow-2xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <p className="text-[0.875rem] font-black text-ink">✏️ {label}</p>
        {multiline ? (
          <textarea ref={ref} data-sheet="off" value={v} maxLength={maxLength} rows={4} onChange={(e) => setV(e.target.value)} onKeyDown={onKey} className={cls} />
        ) : (
          <input ref={ref} data-sheet="off" value={v} maxLength={maxLength} onChange={(e) => setV(e.target.value)} onKeyDown={onKey} className={cls} />
        )}
        <div className="mt-2 flex gap-2">
          <button onClick={() => onDone(null)} className="h-11 flex-1 rounded-2xl border-b-[3px] border-line bg-white text-[0.9375rem] font-extrabold text-ink">
            취소
          </button>
          <button
            onClick={() => onDone(v)}
            className="h-11 flex-[2] rounded-2xl border-b-[3px] border-primary-700 bg-gradient-to-b from-[#4C94FF] to-primary text-[0.9375rem] font-extrabold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

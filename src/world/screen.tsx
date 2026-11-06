import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

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
  const vv = window.visualViewport
  return { w: Math.round(vv?.width ?? window.innerWidth), h: Math.round(vv?.height ?? window.innerHeight) }
}

/**
 * 가로형 게임 화면. 세로로 들고 있으면 화면 전체를 90° 돌려 가로로 보여 줘요.
 * (회전 잠금을 켜 둔 휴대폰도 옆으로 눕히면 바로 플레이)
 */
export function GameRoot({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(readViewport)
  useEffect(() => {
    const on = () => setVp(readViewport())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
      window.visualViewport?.removeEventListener('resize', on)
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
  return (
    <Ctx.Provider value={value}>
      <div className="game-root" style={style}>
        {children}
      </div>
    </Ctx.Provider>
  )
}

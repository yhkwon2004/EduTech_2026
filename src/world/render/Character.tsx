import { forwardRef, memo } from 'react'
import { shade } from './geo'

export interface Look {
  hair: number
  hairColor: string
  outfit: string
  skin: string
  /** 'owner' = 앞치마, 'employee' = 셔츠·넥타이 */
  role?: 'owner' | 'employee' | 'npc'
  pants?: string
}

/** 머리 — 앞모습 앞머리 / 뒷머리 / 뒷모습 */
function HairFront({ style, color }: { style: number; color: string }) {
  const edge = shade(color, -40)
  switch (style % 4) {
    case 0: // 짧은 머리
      return (
        <g>
          <path d="M-12.6 -38 q-1.5 -16 12.6 -16.5 q14 0.5 12.6 16.5 q-2.5 -6 -5.5 -7 q-1.5 3.5 -6 3.5 q-1 -3 -3 -3.5 q-3 3.6 -8 3 q-1.6 0.7 -2.7 4 z" fill={color} stroke={edge} strokeWidth={0.8} />
          <path d="M-12.6 -38 q-1.5 -16 12.6 -16.5 q14 0.5 12.6 16.5 q-2.5 -6 -5.5 -7 q-1.5 3.5 -6 3.5 q-1 -3 -3 -3.5 q-3 3.6 -8 3 q-1.6 0.7 -2.7 4 z" fill="url(#m-hair)" />
          <path d="M-6 -50 q4 -2.5 9 -1.5" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      )
    case 1: // 단발
      return (
        <g>
          <path d="M-13.2 -34 q-2.4 -20.5 13.2 -20.5 q15.6 0 13.2 20.5 l-2.6 0.4 q-0.6 -7.4 -3.2 -10.4 q-4.8 3.2 -12.4 3.2 q-3.6 1.6 -4.6 6.6 z" fill={color} stroke={edge} strokeWidth={0.8} />
          <path d="M-13.2 -34 q-2.4 -20.5 13.2 -20.5 q15.6 0 13.2 20.5 l-2.6 0.4 q-0.6 -7.4 -3.2 -10.4 q-4.8 3.2 -12.4 3.2 q-3.6 1.6 -4.6 6.6 z" fill="url(#m-hair)" />
          <path d="M-7 -50 q4 -3 10 -2" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      )
    case 2: // 묶은 머리
      return (
        <g>
          <path d="M-12.6 -38.5 q-1 -15.5 12.6 -15.8 q13.6 0.3 12.6 15.8 q-5.5 -8.5 -13.4 -8.2 q-6 0.4 -11.8 8.2 z" fill={color} stroke={edge} strokeWidth={0.8} />
          <path d="M-12.6 -38.5 q-1 -15.5 12.6 -15.8 q13.6 0.3 12.6 15.8 q-5.5 -8.5 -13.4 -8.2 q-6 0.4 -11.8 8.2 z" fill="url(#m-hair)" />
          <circle cx={10.5} cy={-50} r={2.2} fill="#F25C54" />
          <path d="M-6 -50.5 q4 -2.5 9 -1.5" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      )
    default: // 모자
      return (
        <g>
          <path d="M-12.4 -40 q-0.4 -14.5 12.4 -14.5 q12.8 0 12.4 14.5 z" fill="#E8574F" stroke="#A8352E" strokeWidth={0.8} />
          <path d="M-12.4 -40 q-0.4 -14.5 12.4 -14.5 q12.8 0 12.4 14.5 z" fill="url(#m-hair)" />
          <path d="M-13.5 -40.5 h27 q3.5 0 4.5 3 q-18 2.5 -36 0 q1 -3 4.5 -3 z" fill="#C2413A" />
          <circle cx={0} cy={-55} r={1.6} fill="#A8352E" />
          <path d="M-12 -40 q-1 4 0 7 M12 -40 q1 4 0 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </g>
      )
  }
}

function HairBehind({ style, color }: { style: number; color: string }) {
  const edge = shade(color, -40)
  if (style % 4 === 1) return <path d="M-13.4 -36 q-1 10 1.8 14 q11.6 3 23.2 0 q2.8 -4 1.8 -14 z" fill={shade(color, -12)} stroke={edge} strokeWidth={0.8} />
  if (style % 4 === 2)
    return (
      <g>
        <path d="M11 -46 q9 2 7.5 12 q-1 6 -4.5 8 q1 -7 -3 -11 z" fill={shade(color, -8)} stroke={edge} strokeWidth={0.8} />
      </g>
    )
  return null
}

function HairBack({ style, color }: { style: number; color: string }) {
  const edge = shade(color, -40)
  const s = style % 4
  if (s === 3)
    return (
      <g>
        <path d="M-12.6 -36 q-1.6 -18.5 12.6 -18.5 q14.2 0 12.6 18.5 q-12.6 3.4 -25.2 0 z" fill={color} stroke={edge} strokeWidth={0.8} />
        <path d="M-12.4 -40 q-0.4 -14.5 12.4 -14.5 q12.8 0 12.4 14.5 z" fill="#E8574F" stroke="#A8352E" strokeWidth={0.8} />
        <path d="M-12.4 -40 q-0.4 -14.5 12.4 -14.5 q12.8 0 12.4 14.5 z" fill="url(#m-hair)" />
        <rect x={-4} y={-42} width={8} height={3} rx={1.5} fill="#A8352E" />
      </g>
    )
  const long = s === 1
  return (
    <g>
      <path d={long ? 'M-13.4 -30 q-2.4 -24.5 13.4 -24.5 q15.8 0 13.4 24.5 q-13.4 4.4 -26.8 0 z' : 'M-12.8 -34 q-1.6 -20.5 12.8 -20.5 q14.4 0 12.8 20.5 q-12.8 3.6 -25.6 0 z'} fill={color} stroke={edge} strokeWidth={0.8} />
      <path d={long ? 'M-13.4 -30 q-2.4 -24.5 13.4 -24.5 q15.8 0 13.4 24.5 q-13.4 4.4 -26.8 0 z' : 'M-12.8 -34 q-1.6 -20.5 12.8 -20.5 q14.4 0 12.8 20.5 q-12.8 3.6 -25.6 0 z'} fill="url(#m-hair)" />
      <path d="M-4 -52 q-2 8 -1 16 M3 -52 q2 8 1 16" stroke={edge} strokeOpacity={0.35} strokeWidth={0.9} fill="none" />
      {s === 2 && (
        <g>
          <circle cx={0} cy={-44} r={2.6} fill="#F25C54" />
          <path d="M-3.5 -43 q-2 10 3.5 17 q5.5 -7 3.5 -17 z" fill={shade(color, -6)} stroke={edge} strokeWidth={0.8} />
        </g>
      )}
    </g>
  )
}

/** 발끝이 (0,0)인 캐릭터. 부모 <g>가 위치를 잡고 이 그림은 모양만 */
export const CharacterArt = memo(function CharacterArt({ look, walking, flip, back = false, scale = 1, bag, seed = 0 }: { look: Look; walking: boolean; flip: boolean; back?: boolean; scale?: number; bag?: boolean; seed?: number }) {
  const pants = look.pants ?? '#34385A'
  const cloth = look.outfit
  const clothEdge = shade(cloth, -50)
  const skinEdge = shade(look.skin, -55)
  const delay = `${(seed % 7) * 0.37}s`
  // 왼팔은 오른팔을 거울로 뒤집어 그려요 (같은 애니메이션 → 서로 반대로 흔들림)
  const arm = (side: -1 | 1) => (
    <g transform={side === -1 ? 'scale(-1,1)' : undefined}>
      <g className={walking ? 'arm-swing' : 'arm-idle'} style={{ transformOrigin: '8.5px -26px', animationDelay: walking ? undefined : delay }}>
        <path d="M8.2 -28 q4.4 1 4.6 5 l0.2 6.4 q-2.4 1.4 -4.6 0 l-0.6 -6 z" fill={cloth} stroke={clothEdge} strokeWidth={0.8} />
        <circle cx={11} cy={-15.4} r={2.7} fill={look.skin} stroke={skinEdge} strokeWidth={0.7} />
      </g>
    </g>
  )
  return (
    <g transform={`scale(${flip ? -scale : scale},${scale})`}>
      <ellipse cx={0} cy={0} rx={10.5} ry={3.8} fill="#1E2A10" opacity={0.3} className={walking ? 'shadow-walk' : ''} />
      <g className={walking ? 'char-bob' : 'char-idle'} style={{ animationDelay: walking ? undefined : delay }}>
        {/* 다리 */}
        <g className={walking ? 'leg-a' : ''} style={{ transformOrigin: '-3.4px -14px' }}>
          <rect x={-6.2} y={-15} width={5.4} height={13.5} rx={2.6} fill={pants} />
          <rect x={-6.2} y={-15} width={2} height={12} rx={1} fill="#FFFFFF" opacity={0.12} />
          <path d="M-7.4 -1.6 q0 -3 3 -3 h2.6 q1.6 0 1.6 2 v1.4 q0 1.2 -1.4 1.2 h-4.6 q-1.2 0 -1.2 -1.6 z" fill="#2E2A33" />
          <path d="M-6.4 -3.6 h3" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={0.8} strokeLinecap="round" />
        </g>
        <g className={walking ? 'leg-b' : ''} style={{ transformOrigin: '3.4px -14px' }}>
          <rect x={0.8} y={-15} width={5.4} height={13.5} rx={2.6} fill={shade(pants, -12)} />
          <path d="M7.4 -1.6 q0 -3 -3 -3 h-2.6 q-1.6 0 -1.6 2 v1.4 q0 1.2 1.4 1.2 h4.6 q1.2 0 1.2 -1.6 z" fill="#25222A" />
        </g>
        {back && arm(-1)}
        {back && arm(1)}
        {/* 몸통 */}
        <g className={walking ? '' : 'char-breathe'} style={{ animationDelay: delay }}>
          <path d="M-8.8 -28.6 q8.8 -3.6 17.6 0 l1.4 13.4 q-10.2 3.4 -20.4 0 z" fill={cloth} stroke={clothEdge} strokeWidth={0.8} />
          <path d="M-8.8 -28.6 q8.8 -3.6 17.6 0 l1.4 13.4 q-10.2 3.4 -20.4 0 z" fill="url(#m-cloth)" />
          {!back && look.role === 'owner' && (
            <g>
              <path d="M-5.8 -26.2 h11.6 l1.4 11.4 q-7.2 2.6 -14.4 0 z" fill="#FFFDF6" stroke="#D9CFBF" strokeWidth={0.7} />
              <path d="M-5.8 -26.2 l-1.6 -2.2 M5.8 -26.2 l1.6 -2.2" stroke="#FFFDF6" strokeWidth={1.6} strokeLinecap="round" />
              <rect x={-3.2} y={-21.5} width={6.4} height={3.6} rx={1} fill="none" stroke="#D9CFBF" strokeWidth={0.8} />
              <circle cx={4} cy={-24} r={1.4} fill={shade(cloth, 10)} />
            </g>
          )}
          {back && look.role === 'owner' && <path d="M-3 -19 q-4 -2 -4 1 q0 3 4 1 q4 2 4 -1 q0 -3 -4 -1 z M-3 -18 l-1 4 M-3 -18 l1 4" fill="#FFFDF6" stroke="#D9CFBF" strokeWidth={0.6} />}
          {!back && look.role === 'employee' && (
            <g>
              <path d="M-4.6 -29.6 l4.6 5.4 l4.6 -5.4 z" fill="#FFFDF6" />
              <path d="M0 -24.4 l-2 2.6 l2 7.6 l2 -7.6 z" fill="#E8574F" stroke="#A8352E" strokeWidth={0.6} />
              <path d="M-4 -28 q-2 5 2 10" stroke="#3156C4" strokeWidth={0.8} fill="none" />
              <rect x={-4.6} y={-19} width={4.4} height={5.4} rx={0.8} fill="#FFFFFF" stroke="#3156C4" strokeWidth={0.7} />
            </g>
          )}
          {!back && look.role === 'npc' && <path d="M-9.6 -21 q9.6 3 19.2 0" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.6} fill="none" />}
          {bag && <rect x={6} y={-25} width={7} height={9} rx={2} fill="#C98B4F" stroke="#7A4E2A" strokeWidth={0.8} />}
        </g>
        {!back && arm(-1)}
        {!back && arm(1)}
        {/* 머리 */}
        <g className={walking ? 'head-walk' : 'char-breathe'} style={{ transformOrigin: '0px -30px', animationDelay: delay }}>
          {!back && <HairBehind style={look.hair} color={look.hairColor} />}
          <circle cx={-12.2} cy={-38.5} r={2.6} fill={look.skin} stroke={skinEdge} strokeWidth={0.7} />
          <circle cx={12.2} cy={-38.5} r={2.6} fill={look.skin} stroke={skinEdge} strokeWidth={0.7} />
          <circle cx={0} cy={-40.5} r={12.4} fill={look.skin} stroke={skinEdge} strokeWidth={0.8} />
          <circle cx={0} cy={-40.5} r={12.4} fill="url(#m-skin)" />
          {back ? (
            <HairBack style={look.hair} color={look.hairColor} />
          ) : (
            <>
              <ellipse cx={-7.2} cy={-34.8} rx={2.6} ry={1.5} fill="#FF8C98" opacity={0.55} />
              <ellipse cx={7.2} cy={-34.8} rx={2.6} ry={1.5} fill="#FF8C98" opacity={0.55} />
              <g className="eye-blink" style={{ animationDelay: delay }}>
                <ellipse cx={-4.4} cy={-38.6} rx={1.8} ry={2.5} fill="#2B2230" />
                <ellipse cx={4.4} cy={-38.6} rx={1.8} ry={2.5} fill="#2B2230" />
                <circle cx={-3.7} cy={-39.6} r={0.75} fill="#FFFFFF" />
                <circle cx={5.1} cy={-39.6} r={0.75} fill="#FFFFFF" />
                <circle cx={-4.9} cy={-37.6} r={0.35} fill="#FFFFFF" opacity={0.8} />
                <circle cx={3.9} cy={-37.6} r={0.35} fill="#FFFFFF" opacity={0.8} />
              </g>
              <path d="M-6.4 -43 q2 -1.2 3.6 -0.2 M2.8 -43.2 q1.6 -1 3.6 0.2" stroke={shade(look.hairColor, -10)} strokeWidth={1} strokeLinecap="round" fill="none" />
              <path d={walking ? 'M-2.2 -34.2 q2.2 2.6 4.4 0 q-2.2 1 -4.4 0 z' : 'M-2.4 -34.4 q2.4 2.2 4.8 0'} stroke="#7A3A2E" strokeWidth={1.1} fill={walking ? '#C9545C' : 'none'} strokeLinecap="round" />
              <HairFront style={look.hair} color={look.hairColor} />
            </>
          )}
        </g>
      </g>
    </g>
  )
})

/** 위치는 ref로 직접 움직여요 (리렌더 없이 60fps) */
export const CharacterNode = forwardRef<SVGGElement, { look: Look; walking: boolean; flip: boolean; back?: boolean; name?: string; scale?: number; bubble?: string; me?: boolean; seed?: number }>(function CharacterNode(
  { look, walking, flip, back, name, scale = 1, bubble, me, seed },
  ref,
) {
  return (
    <g ref={ref} style={{ pointerEvents: 'none' }}>
      {me && (
        <g>
          <ellipse cx={0} cy={0} rx={15} ry={6.5} fill="none" stroke="#FFE27A" strokeWidth={2} opacity={0.9} className="me-ring" />
        </g>
      )}
      <CharacterArt look={look} walking={walking} flip={flip} back={back} scale={scale} seed={seed} />
      {name && (
        <g transform={`translate(0,${-66 * scale})`}>
          <rect x={-name.length * 5.6 - 9} y={-9} width={name.length * 11.2 + 18} height={18} rx={9} fill="#1A1236" opacity={0.78} />
          <rect x={-name.length * 5.6 - 9} y={-9} width={name.length * 11.2 + 18} height={18} rx={9} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1} />
          {me && <circle cx={-name.length * 5.6 - 2} cy={0} r={2.6} fill="#FFE27A" />}
          <text x={me ? 3 : 0} y={4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#fff" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            {name}
          </text>
        </g>
      )}
      {bubble && (
        <g transform={`translate(0,${-82 * scale})`} className="bubble-pop">
          <rect x={-16} y={-14} width={32} height={24} rx={12} fill="#fff" stroke="#4A3426" strokeWidth={1} />
          <path d="M-4 9.5 l4 5 l4 -5 z" fill="#fff" />
          <text y={3.5} textAnchor="middle" fontSize={13}>
            {bubble}
          </text>
        </g>
      )}
    </g>
  )
})

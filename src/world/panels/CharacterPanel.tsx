import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Pause, Play, RotateCcw, Shuffle } from 'lucide-react'
import { useGame } from '@/game/store'
import { CharacterArt, type Act, type Expr, type Pose } from '../render/Character'
import { WorldDefs } from '../render/Defs'
import { useWorld, levelOf } from '../store'
import { JOB_MAP, RANKS } from '../jobs'
import { ACT_MS } from '../emote'
import {
  BOTTOMS,
  BOTTOM_COLORS,
  BROWS,
  CLOTH_COLORS,
  DEFAULT_AVATAR,
  EYES,
  EYE_COLORS,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MOUTHS,
  SHOE_COLORS,
  SKINS,
  TOPS,
  VILLAGERS,
  randomAvatar,
  toLook,
  type Avatar,
  type Look,
  type Role,
} from '../avatar'
import { cx, GameButton, Panel, Tabs, toast } from '../ui/kit'

const FONT = 'Pretendard Variable, Pretendard, "Noto Sans KR", sans-serif'

/* ───────── 360° 미리보기 (끌어서 돌리기) ───────── */
type Motion = 'idle' | 'walk' | 'wave' | 'cheer' | 'work' | 'stretch'

export function Turntable({ look, size = 190, controls = true }: { look: Look; size?: number; controls?: boolean }) {
  const [yaw, setYaw] = useState(20)
  const [spin, setSpin] = useState(true)
  const [motion, setMotion] = useState<Motion>('idle')
  const [actKey, setActKey] = useState(0)
  const drag = useRef<{ x: number; yaw: number } | null>(null)
  useEffect(() => {
    if (!spin) return
    const t = setInterval(() => setYaw((y) => y + 90), 1100)
    return () => clearInterval(t)
  }, [spin])
  useEffect(() => {
    if (motion === 'idle' || motion === 'walk') return
    const t = setTimeout(() => setMotion('idle'), ACT_MS[motion as Act] + 80)
    return () => clearTimeout(t)
  }, [motion, actKey])
  const play = (m: Motion) => {
    setMotion(m)
    setActKey((k) => k + 1)
  }
  const act: Act | null = motion === 'idle' || motion === 'walk' ? null : motion
  const quant = yaw
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size * 1.1}
        viewBox="-34 -76 68 82"
        className="touch-none select-none rounded-3xl bg-gradient-to-b from-[#D6F1FF] via-[#BCE6FA] to-[#9AD6F2] shadow-inner"
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          drag.current = { x: e.clientX, yaw }
          setSpin(false)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          setYaw(drag.current.yaw - (e.clientX - drag.current.x) * 1.4)
        }}
        onPointerUp={() => (drag.current = null)}
        style={{ cursor: 'grab' }}
        aria-label="캐릭터 미리보기 (끌어서 돌리기)"
      >
        <WorldDefs />
        <ellipse cx={0} cy={1} rx={26} ry={7} fill="#7CC36A" />
        <ellipse cx={0} cy={0} rx={26} ry={7} fill="#8FD46F" />
        <ellipse cx={-6} cy={-1.5} rx={12} ry={2.5} fill="#FFFFFF" opacity={0.18} />
        <CharacterArt key={actKey} look={look} yaw={quant} walking={motion === 'walk'} act={act} speed={0.5} />
      </svg>
      {controls && (
        <>
          <div className="flex items-center gap-1">
            <button aria-label="왼쪽으로 돌리기" onClick={() => (setSpin(false), setYaw((y) => y - 90))} className="grid size-8 place-items-center rounded-xl bg-black/5 text-[0.875rem] font-black">
              ⟲
            </button>
            <button aria-label={spin ? '회전 멈춤' : '자동 회전'} onClick={() => setSpin(!spin)} className="grid size-8 place-items-center rounded-xl bg-black/5">
              {spin ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button aria-label="오른쪽으로 돌리기" onClick={() => (setSpin(false), setYaw((y) => y + 90))} className="grid size-8 place-items-center rounded-xl bg-black/5 text-[0.875rem] font-black">
              ⟳
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {(
              [
                ['idle', '대기'],
                ['walk', '걷기'],
                ['wave', '인사'],
                ['cheer', '환호'],
                ['work', '작업'],
                ['stretch', '기지개'],
              ] as const
            ).map(([m, label]) => (
              <button key={m} onClick={() => (m === 'idle' || m === 'walk' ? setMotion(m) : play(m))} className={cx('h-7 rounded-lg px-2 text-[0.6875rem] font-black', motion === m ? 'bg-ink text-white' : 'bg-black/5')}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ───────── 꾸미기 ───────── */
function MiniHead({ look }: { look: Look }) {
  return (
    <svg width={38} height={38} viewBox="-17 -56 34 34" aria-hidden>
      <CharacterArt look={look} part="head" yaw={30} pose="idle" />
    </svg>
  )
}

function Swatches({ list, value, onPick }: { list: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((c) => (
        <button key={c} aria-label={c} onClick={() => onPick(c)} className={cx('size-8 rounded-full border-2 border-white shadow ring-offset-1', value === c && 'ring-[3px] ring-primary')} style={{ background: c }} />
      ))}
    </div>
  )
}

function Choices({ names, value, onPick, preview }: { names: string[]; value: number; onPick: (i: number) => void; preview?: (i: number) => Look }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((n, i) => (
        <button key={n} onClick={() => onPick(i)} className={cx('flex items-center gap-1 rounded-xl py-0.5 pl-0.5 pr-2.5 text-[0.75rem] font-black', value === i ? 'bg-ink text-white' : 'bg-black/5', !preview && 'h-8 pl-2.5')}>
          {preview && (
            <span className={cx('grid place-items-center rounded-lg', value === i ? 'bg-white/90' : 'bg-white')}>
              <MiniHead look={preview(i)} />
            </span>
          )}
          {n}
        </button>
      ))}
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="mb-1 text-[0.6875rem] font-black text-sub">{label}</p>
    {children}
  </div>
)

type EditTab = 'face' | 'hair' | 'acc' | 'cloth'

export function CharacterEditor({ value, onChange, role, name, onName }: { value: Avatar; onChange: (a: Avatar) => void; role: Role; name?: string; onName?: (n: string) => void }) {
  const [tab, setTab] = useState<EditTab>('hair')
  const look = toLook(value, role)
  const set = (p: Partial<Avatar>) => onChange({ ...look, ...p })
  const v = (p: Partial<Avatar>) => toLook({ ...look, ...p }, role)
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <Turntable look={look} size={170} />
        {onName && (
          <input value={name ?? ''} onChange={(e) => onName(e.target.value)} maxLength={8} placeholder="이름 (예: 김사장)" className="h-10 w-[11rem] rounded-xl border-2 border-black/10 bg-white px-3 text-center text-[0.9375rem] font-black outline-none focus:border-primary" />
        )}
        <div className="flex gap-1.5">
          <GameButton size="sm" tone="violet" onClick={() => onChange(randomAvatar())}>
            <Shuffle className="size-3.5" /> 랜덤
          </GameButton>
          <GameButton size="sm" tone="white" onClick={() => onChange({ ...DEFAULT_AVATAR })}>
            <RotateCcw className="size-3.5" /> 처음대로
          </GameButton>
        </div>
      </div>
      <div className="min-w-0 space-y-2.5">
        <div className="flex gap-1">
          {(
            [
              ['hair', '💇 머리'],
              ['face', '🙂 얼굴'],
              ['acc', '🧢 모자·안경'],
              ['cloth', '👕 옷'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cx('h-8 rounded-xl px-2.5 text-[0.75rem] font-black', tab === id ? 'bg-primary text-white' : 'bg-black/5')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'hair' && (
          <>
            <Row label="머리 모양">
              <Choices names={HAIR_STYLES} value={look.hair} onPick={(i) => set({ hair: i })} preview={(i) => v({ hair: i, hat: 0 })} />
            </Row>
            <Row label="머리 색">
              <Swatches list={HAIR_COLORS} value={look.hairColor} onPick={(c) => set({ hairColor: c })} />
            </Row>
          </>
        )}
        {tab === 'face' && (
          <>
            <Row label="피부 톤">
              <Swatches list={SKINS} value={look.skin} onPick={(c) => set({ skin: c })} />
            </Row>
            <Row label="눈">
              <Choices names={EYES} value={look.eyes} onPick={(i) => set({ eyes: i })} preview={(i) => v({ eyes: i })} />
            </Row>
            <Row label="눈동자 색">
              <Swatches list={EYE_COLORS} value={look.eyeColor} onPick={(c) => set({ eyeColor: c })} />
            </Row>
            <Row label="눈썹">
              <Choices names={BROWS} value={look.brows} onPick={(i) => set({ brows: i })} preview={(i) => v({ brows: i })} />
            </Row>
            <Row label="입">
              <Choices names={MOUTHS} value={look.mouth} onPick={(i) => set({ mouth: i })} preview={(i) => v({ mouth: i })} />
            </Row>
            <label className="flex w-fit items-center gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-[0.75rem] font-black">
              <input type="checkbox" checked={look.blush} onChange={(e) => set({ blush: e.target.checked })} className="size-4 accent-primary" /> 볼터치
            </label>
          </>
        )}
        {tab === 'acc' && (
          <>
            <Row label="모자">
              <Choices names={HATS} value={look.hat} onPick={(i) => set({ hat: i })} preview={(i) => v({ hat: i })} />
            </Row>
            <Row label="안경">
              <Choices names={GLASSES} value={look.glasses} onPick={(i) => set({ glasses: i })} preview={(i) => v({ glasses: i })} />
            </Row>
          </>
        )}
        {tab === 'cloth' && (
          <>
            <Row label="상의">
              <Choices names={TOPS} value={look.top} onPick={(i) => set({ top: i })} />
            </Row>
            <Row label="상의 색">
              <Swatches list={CLOTH_COLORS} value={look.outfit} onPick={(c) => set({ outfit: c })} />
            </Row>
            <Row label="하의">
              <Choices names={BOTTOMS} value={look.bottom} onPick={(i) => set({ bottom: i })} />
            </Row>
            <Row label="하의 색">
              <Swatches list={BOTTOM_COLORS} value={look.bottomColor} onPick={(c) => set({ bottomColor: c })} />
            </Row>
            <Row label="신발">
              <Swatches list={SHOE_COLORS} value={look.shoes} onPick={(c) => set({ shoes: c })} />
            </Row>
            <p className="text-[0.6875rem] font-semibold text-mute">{role === 'owner' ? '사장님은 앞치마를, ' : role === 'employee' ? '직장인은 셔츠 깃·넥타이·사원증을, ' : ''}진로에 맞춰 자동으로 걸쳐요.</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ───────── 캐릭터 시트 (이미지로 저장 가능) ───────── */
async function saveSvgAsPng(svg: SVGSVGElement, fileName: string, w: number, h: number) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('이미지를 만들지 못했어요'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FFFDF7'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const a = document.createElement('a')
    a.download = `${fileName}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

function T({ x, y, size = 12, w = 700, fill = '#2A2140', anchor = 'start', children }: { x: number; y: number; size?: number; w?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={w} fill={fill} textAnchor={anchor} fontFamily={FONT}>
      {children}
    </text>
  )
}

function Fig({ x, y, look, s, yaw = 20, pose = 'idle', expr }: { x: number; y: number; look: Look; s: number; yaw?: number; pose?: Pose; expr?: Expr }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={1} rx={13 * s} ry={3.6 * s} fill="#E9E2D2" />
      <CharacterArt look={look} yaw={yaw} pose={pose} expr={expr ?? null} scale={s} />
    </g>
  )
}

export function CharacterSheet({ look, name, subtitle }: { look: Look; name: string; subtitle: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const W = 1000
  const H = 650
  const views = [
    [30, '앞 · 오른쪽'],
    [-30, '앞 · 왼쪽'],
    [-150, '뒤 · 왼쪽'],
    [150, '뒤 · 오른쪽'],
  ] as const
  const exprs: [Expr, string][] = [
    ['normal', '기본'],
    ['happy', '웃음'],
    ['surprised', '놀람'],
    ['tired', '피곤'],
    ['talk', '말하기'],
  ]
  const poses: [Pose, string, number][] = [
    ['idle', '대기', 20],
    ['walk', '걷기', 60],
    ['wave', '인사', 15],
    ['cheer', '환호', 0],
    ['work', '작업', 35],
  ]
  const palette: [string, string][] = [
    ['피부', look.skin],
    ['머리', look.hairColor],
    ['상의', look.outfit],
    ['하의', look.bottomColor],
    ['신발', look.shoes],
    ['눈동자', look.eyeColor],
  ]
  const spec: [string, string][] = [
    ['머리', HAIR_STYLES[look.hair]],
    ['눈 · 눈썹', `${EYES[look.eyes]} · ${BROWS[look.brows]}`],
    ['입', `${MOUTHS[look.mouth]}${look.blush ? ' · 볼터치' : ''}`],
    ['모자 · 안경', `${HATS[look.hat]} · ${GLASSES[look.glasses]}`],
    ['옷', `${TOPS[look.top]} · ${BOTTOMS[look.bottom]}`],
    ['역할 의상', look.role === 'owner' ? '사장님 앞치마' : look.role === 'employee' ? '넥타이 · 사원증' : '평상복'],
  ]
  const s1 = 3.4
  const base = 316
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[0.75rem] font-semibold text-sub">정면부터 뒷모습까지, 표정·포즈·색 정보를 한 장에 담았어요.</p>
        <GameButton
          size="sm"
          tone="green"
          onClick={() => {
            if (!ref.current) return
            saveSvgAsPng(ref.current, `${name}_캐릭터시트`, W * 2, H * 2)
              .then(() => toast('캐릭터 시트를 이미지로 저장했어요'))
              .catch(() => toast('이미지 저장에 실패했어요', 'bad'))
          }}
        >
          <Download className="size-3.5" /> 이미지로 저장
        </GameButton>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border-2 border-black/5 bg-[#FFFDF7]">
        <WorldDefs />
        <defs>
          <pattern id="sheet-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0 L0 0 0 20" fill="none" stroke="#EFE8D8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="#FFFDF7" />
        <rect x={16} y={70} width={W - 32} height={270} rx={14} fill="url(#sheet-grid)" stroke="#E6DCC6" />
        {/* 머리글 */}
        <rect x={0} y={0} width={W} height={58} fill="#202244" />
        <T x={24} y={24} size={11} w={800} fill="#FFD35A">
          CHARACTER SHEET · 캐릭터 시트
        </T>
        <T x={24} y={47} size={21} w={900} fill="#FFFFFF">
          {name}
        </T>
        <T x={40 + name.length * 21} y={46} size={12} w={700} fill="#C9CCE8">
          {subtitle}
        </T>
        <T x={W - 24} y={38} size={18} w={900} fill="#FFFFFF" anchor="end">
          👑 골목 장사왕
        </T>
        {/* 비율 안내선 */}
        {[
          [base, '발'],
          [base - 13 * s1, '허리'],
          [base - 24.7 * s1, '어깨'],
          [base - 54.6 * s1, '머리 끝'],
        ].map(([yy, label]) => (
          <g key={label as string}>
            <line x1={70} x2={W - 30} y1={yy as number} y2={yy as number} stroke="#C9B48C" strokeDasharray="5 5" strokeWidth={1} />
            <T x={26} y={(yy as number) + 4} size={10} w={800} fill="#A88B5C">
              {label as string}
            </T>
          </g>
        ))}
        {views.map(([yaw, label], i) => (
          <g key={label}>
            <Fig x={200 + i * 215} y={base} look={look} s={s1} yaw={yaw} />
            <T x={200 + i * 215} y={base + 20} size={12} w={800} anchor="middle" fill="#5B4A30">
              {label}
            </T>
          </g>
        ))}
        {/* 표정 */}
        <T x={24} y={372} size={13} w={900}>
          표정
        </T>
        {exprs.map(([e, label], i) => (
          <g key={e} transform={`translate(${112 + i * 86},${352 + 37.7 * 1.9 + 34})`}>
            <circle cx={0} cy={-37.7 * 1.9} r={36} fill="#F4EEFF" />
            <CharacterArt look={look} part="head" yaw={i % 2 ? -30 : 30} pose="idle" expr={e} scale={1.9} />
            <T x={0} y={-22} size={11} w={800} anchor="middle" fill="#5B4A30">
              {label}
            </T>
          </g>
        ))}
        {/* 포즈 */}
        <T x={24} y={478} size={13} w={900}>
          포즈 · 동작
        </T>
        {poses.map(([p, label, yaw], i) => (
          <g key={p}>
            <Fig x={78 + i * 92} y={616} look={look} s={1.5} yaw={yaw} pose={p} />
            <T x={78 + i * 92} y={636} size={11} w={800} anchor="middle" fill="#5B4A30">
              {label}
            </T>
          </g>
        ))}
        {/* 팔레트 */}
        <rect x={510} y={356} width={474} height={284} rx={14} fill="#FFFFFF" stroke="#E6DCC6" />
        <T x={530} y={384} size={13} w={900}>
          컬러 팔레트
        </T>
        {palette.map(([label, col], i) => (
          <g key={label} transform={`translate(${530 + i * 75},398)`}>
            <rect width={64} height={44} rx={10} fill={col} stroke="#D9CFBF" />
            <T x={32} y={60} size={11} w={800} anchor="middle">
              {label}
            </T>
            <T x={32} y={74} size={9.5} w={600} anchor="middle" fill="#8A7A60">
              {col.toUpperCase()}
            </T>
          </g>
        ))}
        <T x={530} y={500} size={13} w={900}>
          디자인 노트
        </T>
        {spec.map(([k, val], i) => (
          <g key={k}>
            <T x={530 + (i % 2) * 230} y={524 + Math.floor(i / 2) * 26} size={10.5} w={800} fill="#8A7A60">
              {k}
            </T>
            <T x={600 + (i % 2) * 230} y={524 + Math.floor(i / 2) * 26} size={11.5} w={800}>
              {val}
            </T>
          </g>
        ))}
        <T x={530} y={622} size={10} w={600} fill="#A99A80">
          손으로 찍은 도트 원화 · 4방향 · 걷기/대기/인사/환호/작업/기지개/하품 프레임 애니메이션 · 눈 깜빡임
        </T>
      </svg>
    </div>
  )
}

export function CastSheet({ me }: { me: { look: Look; name: string; title: string } }) {
  const ref = useRef<SVGSVGElement>(null)
  const W = 1000
  const H = 420
  const cast = [{ look: me.look, name: me.name, job: me.title, scale: 1, line: '오늘도 힘내 보자!' }, ...VILLAGERS.map((v) => ({ look: v.look, name: v.name, job: v.job, scale: v.scale, line: v.lines[0] }))]
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[0.75rem] font-semibold text-sub">우리 골목에 사는 사람들이에요. 길에서 만나면 인사하고 말을 걸어요.</p>
        <GameButton
          size="sm"
          tone="green"
          onClick={() => {
            if (!ref.current) return
            saveSvgAsPng(ref.current, '골목_마을사람들', W * 2, H * 2)
              .then(() => toast('마을 사람들 시트를 저장했어요'))
              .catch(() => toast('이미지 저장에 실패했어요', 'bad'))
          }}
        >
          <Download className="size-3.5" /> 이미지로 저장
        </GameButton>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border-2 border-black/5 bg-[#FFFDF7]">
        <WorldDefs />
        <rect width={W} height={H} fill="#FFFDF7" />
        <rect x={0} y={0} width={W} height={50} fill="#2E9C6A" />
        <T x={24} y={32} size={18} w={900} fill="#FFFFFF">
          골목 마을 사람들 · CAST
        </T>
        <rect x={16} y={272} width={W - 32} height={10} rx={5} fill="#E9E2D2" />
        {cast.map((c, i) => {
          const x = 70 + i * 123
          return (
            <g key={c.name}>
              <rect x={x - 54} y={66} width={108} height={36} rx={18} fill="#FFFFFF" stroke="#E6DCC6" />
              <T x={x} y={89} size={10.5} w={700} anchor="middle" fill="#5B4A30">
                {c.line.length > 9 ? `${c.line.slice(0, 9)}…` : c.line}
              </T>
              <Fig x={x} y={276} look={c.look} s={2.35 * c.scale} yaw={i % 2 ? -25 : 25} pose={i === 0 ? 'wave' : 'idle'} />
              <T x={x} y={310} size={14} w={900} anchor="middle" fill={i === 0 ? '#3156C4' : '#2A2140'}>
                {c.name}
              </T>
              <T x={x} y={328} size={10.5} w={700} anchor="middle" fill="#8A7A60">
                {c.job}
              </T>
              <g transform={`translate(${x - 26},${340})`}>
                {[c.look.skin, c.look.hairColor, c.look.outfit, c.look.bottomColor].map((col, k) => (
                  <rect key={k} x={k * 14} y={0} width={12} height={12} rx={3} fill={col} stroke="#D9CFBF" />
                ))}
              </g>
            </g>
          )
        })}
        <T x={W / 2} y={398} size={10.5} w={600} anchor="middle" fill="#A99A80">
          모든 캐릭터는 같은 손 도트 원화에 색만 바꿔 입혀 4방향으로 움직이고, 걷기·인사·말하기 동작을 해요.
        </T>
      </svg>
    </div>
  )
}

/* ───────── 내 캐릭터 패널 ───────── */
type Tab = 'edit' | 'sheet' | 'cast'

export function CharacterPanel({ onClose }: { onClose: () => void }) {
  const w = useWorld()
  const g = useGame()
  const [tab, setTab] = useState<Tab>('edit')
  const role: Role = w.path === 'employee' ? 'employee' : 'owner'
  const look = toLook(w.avatar, role)
  const title = w.job ? `${JOB_MAP[w.job.id].name} ${RANKS[w.job.rank].name}` : g.started ? `${g.shopName} 사장님` : w.path === 'owner' ? '예비 사장님' : '취업 준비생'
  const subtitle = `${title} · ${w.region.sido} ${w.region.gu} ${w.region.dong} · Lv.${levelOf(w.exp).level}`
  return (
    <Panel
      title="내 캐릭터"
      icon="🧑‍🎨"
      color="#E86FA0"
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'edit', label: '🎨 꾸미기' },
            { id: 'sheet', label: '📋 캐릭터 시트' },
            { id: 'cast', label: '🏘️ 마을 사람들' },
          ]}
        />
      }
    >
      {tab === 'edit' && <CharacterEditor value={w.avatar} onChange={(a) => w.setAvatar(a)} role={role} name={w.name} onName={(n) => n.trim() && w.setAvatar({}, n.slice(0, 8))} />}
      {tab === 'sheet' && <CharacterSheet look={look} name={w.name || '나'} subtitle={subtitle} />}
      {tab === 'cast' && <CastSheet me={{ look, name: w.name || '나', title }} />}
    </Panel>
  )
}

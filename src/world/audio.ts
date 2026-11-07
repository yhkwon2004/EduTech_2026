/**
 * 소리 — 파일 없이 브라우저에서 바로 합성 (Web Audio)
 * - 효과음: 톡, 코인, 정답 차임, 오답, 레벨업, 별, 책장, 수확, 발소리 …
 * - 배경음악: C장조 5음계로 만든 잔잔한 패드 + 오르골 멜로디 (매번 조금씩 달라요), 낮엔 새소리, 밤엔 풀벌레
 * 브라우저 정책상 첫 터치 이후부터 소리가 나요.
 */
type Sfx = 'tap' | 'open' | 'close' | 'coin' | 'correct' | 'wrong' | 'combo' | 'levelup' | 'star' | 'page' | 'harvest' | 'plant' | 'step' | 'pop' | 'unlock' | 'chest'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let sfxOn = true
let bgmOn = true
let bgmTimer: number | null = null
let unlocked = false

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.9
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 6500
      master.connect(lp).connect(ctx.destination)
      musicBus = ctx.createGain()
      musicBus.gain.value = 0
      musicBus.connect(master)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; attack?: number; bus?: AudioNode; glide?: number; detune?: number } = {}) {
  const c = ctx
  if (!c || !master) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, at)
  if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, at + dur)
  if (opts.detune) o.detune.value = opts.detune
  const peak = opts.gain ?? 0.12
  const atk = opts.attack ?? 0.008
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(opts.bus ?? master)
  o.start(at)
  o.stop(at + dur + 0.05)
}

/** 오르골 같은 소리 (기본음 + 두 배음) */
function bell(freq: number, at: number, dur = 0.9, gain = 0.08, bus?: AudioNode) {
  tone(freq, at, dur, { type: 'sine', gain, bus })
  tone(freq * 2, at, dur * 0.6, { type: 'sine', gain: gain * 0.35, bus })
  tone(freq * 3.01, at, dur * 0.3, { type: 'triangle', gain: gain * 0.12, bus })
}

function noise(at: number, dur: number, gain: number, freq = 2000) {
  const c = ctx
  if (!c || !master) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 0.8
  const g = c.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(master)
  src.start(at)
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

export function sfx(name: Sfx) {
  if (!sfxOn || !unlocked) return
  const c = ensure()
  if (!c) return
  const t = c.currentTime + 0.01
  switch (name) {
    case 'tap':
      tone(880, t, 0.07, { type: 'triangle', gain: 0.05, glide: 660 })
      break
    case 'pop':
      tone(520, t, 0.09, { type: 'sine', gain: 0.08, glide: 980 })
      break
    case 'open':
      tone(392, t, 0.16, { type: 'sine', gain: 0.05, glide: 784 })
      bell(NOTE(84), t + 0.06, 0.4, 0.03)
      break
    case 'close':
      tone(660, t, 0.14, { type: 'sine', gain: 0.045, glide: 330 })
      break
    case 'coin':
      bell(NOTE(88), t, 0.35, 0.07)
      bell(NOTE(93), t + 0.07, 0.5, 0.07)
      break
    case 'correct':
      ;[72, 76, 79, 84].forEach((n, i) => bell(NOTE(n), t + i * 0.07, 0.8, 0.07))
      break
    case 'combo':
      ;[79, 84, 88, 91].forEach((n, i) => bell(NOTE(n), t + i * 0.05, 0.6, 0.06))
      break
    case 'wrong':
      tone(330, t, 0.22, { type: 'triangle', gain: 0.06, glide: 247 })
      tone(262, t + 0.12, 0.3, { type: 'triangle', gain: 0.05, glide: 220 })
      break
    case 'levelup':
      ;[60, 64, 67, 72, 76, 79, 84].forEach((n, i) => bell(NOTE(n), t + i * 0.08, 1.2, 0.07))
      tone(NOTE(48), t, 1.4, { type: 'triangle', gain: 0.05, attack: 0.05 })
      break
    case 'star':
      bell(NOTE(96), t, 0.5, 0.06)
      bell(NOTE(100), t + 0.05, 0.5, 0.04)
      break
    case 'page':
      noise(t, 0.16, 0.12, 3200)
      break
    case 'harvest':
      bell(NOTE(76), t, 0.4, 0.07)
      bell(NOTE(83), t + 0.09, 0.6, 0.07)
      noise(t, 0.08, 0.05, 1200)
      break
    case 'plant':
      tone(220, t, 0.12, { type: 'triangle', gain: 0.07, glide: 160 })
      noise(t, 0.1, 0.06, 700)
      break
    case 'step':
      noise(t, 0.05, 0.025, 900)
      break
    case 'unlock':
      ;[67, 71, 74, 79, 83, 86].forEach((n, i) => bell(NOTE(n), t + i * 0.06, 1, 0.06))
      break
    case 'chest':
      tone(196, t, 0.2, { type: 'triangle', gain: 0.07 })
      ;[79, 83, 86, 91].forEach((n, i) => bell(NOTE(n), t + 0.18 + i * 0.07, 0.9, 0.06))
      break
  }
}

/* ───────── 배경음악 ───────── */
const CHORDS = [
  [48, 55, 64, 71], // Cmaj7
  [45, 52, 60, 67], // Am7
  [41, 48, 57, 64], // Fmaj7
  [43, 50, 59, 64], // G6
]
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88]
const BEAT = 0.8

function scheduleBar(start: number, bar: number) {
  if (!ctx || !musicBus) return
  const chord = CHORDS[bar % CHORDS.length]
  // 패드
  for (const n of chord) {
    tone(NOTE(n), start, BEAT * 4 + 0.6, { type: 'sine', gain: 0.045, attack: 0.9, bus: musicBus, detune: (Math.random() - 0.5) * 8 })
    tone(NOTE(n), start, BEAT * 4 + 0.6, { type: 'triangle', gain: 0.012, attack: 1.2, bus: musicBus, detune: 7 })
  }
  // 오르골 멜로디
  let last = Math.floor(Math.random() * PENTA.length)
  for (let b = 0; b < 8; b++) {
    if (Math.random() < (b % 2 === 0 ? 0.55 : 0.25)) {
      last = Math.max(0, Math.min(PENTA.length - 1, last + Math.round((Math.random() - 0.5) * 3)))
      bell(NOTE(PENTA[last]), start + b * (BEAT / 2), 1.6, 0.05, musicBus)
    }
  }
  // 낮엔 새소리, 밤엔 풀벌레
  const h = new Date().getHours()
  if (h >= 6 && h < 19 && Math.random() < 0.35) {
    const at = start + Math.random() * BEAT * 3
    for (let k = 0; k < 3; k++) tone(2600 + Math.random() * 600, at + k * 0.11, 0.09, { type: 'sine', gain: 0.018, glide: 3600, bus: musicBus })
  } else if ((h >= 19 || h < 6) && Math.random() < 0.6) {
    const at = start + Math.random() * BEAT * 3
    for (let k = 0; k < 6; k++) tone(4200, at + k * 0.06, 0.03, { type: 'sine', gain: 0.008, bus: musicBus })
  }
}

let nextBarAt = 0
let barIndex = 0
function bgmTick() {
  if (!ctx) return
  while (nextBarAt < ctx.currentTime + 1.5) {
    scheduleBar(nextBarAt, barIndex++)
    nextBarAt += BEAT * 4
  }
}

function startBgm() {
  const c = ensure()
  if (!c || !musicBus || bgmTimer !== null) return
  nextBarAt = c.currentTime + 0.2
  musicBus.gain.cancelScheduledValues(c.currentTime)
  musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime)
  musicBus.gain.linearRampToValueAtTime(0.85, c.currentTime + 3)
  bgmTick()
  bgmTimer = window.setInterval(bgmTick, 500)
}

function stopBgm() {
  if (bgmTimer !== null) window.clearInterval(bgmTimer)
  bgmTimer = null
  if (ctx && musicBus) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime)
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime)
    musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
  }
}

export function setAudio(opts: { sfx?: boolean; bgm?: boolean }) {
  if (opts.sfx !== undefined) sfxOn = opts.sfx
  if (opts.bgm !== undefined) {
    bgmOn = opts.bgm
    if (unlocked) {
      if (bgmOn) startBgm()
      else stopBgm()
    }
  }
}

/** 첫 터치에서 소리 켜기 */
export function installAudioUnlock() {
  if (typeof window === 'undefined') return
  const go = () => {
    if (unlocked) return
    unlocked = true
    ensure()
    if (bgmOn) startBgm()
    window.removeEventListener('pointerdown', go)
    window.removeEventListener('keydown', go)
  }
  window.addEventListener('pointerdown', go)
  window.addEventListener('keydown', go)
  // 화면을 떠나면 조용히
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else void ctx.resume()
  })
}

/**
 * 듣기 모드 — 손이 바쁠 때 레슨 카드를 소리로 읽어 줍니다 (브라우저 내장 음성 합성).
 */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function koreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'ko-KR') ?? voices.find((v) => v.lang.startsWith('ko'))
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): void {
  if (!speechSupported()) {
    opts.onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.rate = opts.rate ?? 1
  const v = koreanVoice()
  if (v) u.voice = v
  u.onend = () => opts.onEnd?.()
  u.onerror = () => opts.onEnd?.()
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel()
}

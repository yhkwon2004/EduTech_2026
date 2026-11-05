/** 받침에 맞춰 조사 붙이기: josa('광고', '을/를') → '광고를' */
export function josa(word: string, pair: '을/를' | '이/가' | '은/는' | '과/와' | '으로/로'): string {
  const [withBatchim, without] = pair.split('/')
  const code = word.charCodeAt(word.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return `${word}${without}` // 한글이 아니면 받침 없는 쪽
  const jong = (code - 0xac00) % 28
  if (pair === '으로/로') return `${word}${jong === 0 || jong === 8 ? without : withBatchim}`
  return `${word}${jong ? withBatchim : without}`
}

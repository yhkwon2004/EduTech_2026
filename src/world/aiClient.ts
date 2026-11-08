import Anthropic from '@anthropic-ai/sdk'
import { useCompany } from './companyStore'
import { DEPT_MAP, type DeptId } from './company'
import { DEFAULT_MODEL, DEPT_TOOLS, TOOL_DEFS, runTool, snapshot, systemFor, type ChatTurn } from './ai'

/** Anthropic SDK를 쓰는 부분만 따로 — 경영진 탭에서 처음 말을 걸 때 불러와요 */
export interface AdvisorResult {
  text: string
  actions: string[]
  usage?: { input: number; output: number }
}

/** 부서장과 한 턴 대화 (도구 실행 포함) */
export async function askAdvisor(dept: DeptId, history: ChatTurn[], message: string, opts: { apiKey: string; model?: string; signal?: AbortSignal }): Promise<AdvisorResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 })
  const model = opts.model || DEFAULT_MODEL
  const tools = TOOL_DEFS.filter((t) => DEPT_TOOLS[dept].includes(t.name))
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map((h): Anthropic.MessageParam => ({ role: h.role, content: h.text })),
    { role: 'user', content: `[현재 게임 상태]\n${JSON.stringify(snapshot())}\n\n[CEO의 말]\n${message}` },
  ]
  const actions: string[] = []
  let text = ''
  let usage = { input: 0, output: 0 }
  for (let round = 0; round < 6; round++) {
    const res = await client.messages.create(
      {
        model,
        max_tokens: 2048,
        system: [{ type: 'text', text: systemFor(dept), cache_control: { type: 'ephemeral' } }],
        tools,
        messages,
        output_config: { effort: 'low' },
      },
      { signal: opts.signal },
    )
    usage = { input: usage.input + res.usage.input_tokens, output: usage.output + res.usage.output_tokens }
    for (const b of res.content) if (b.type === 'text') text += (text ? '\n' : '') + b.text
    if (res.stop_reason === 'refusal') return { text: text || '죄송해요, 그 요청은 도와드리기 어려워요.', actions, usage }
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (res.stop_reason !== 'tool_use' || !uses.length) break
    messages.push({ role: 'assistant', content: res.content })
    const results: Anthropic.ToolResultBlockParam[] = uses.map((u) => {
      const r = runTool(u.name, (u.input ?? {}) as Record<string, unknown>)
      if (r.ok) {
        actions.push(r.text)
        useCompany.getState().note(`${DEPT_MAP[dept].emoji} ${DEPT_MAP[dept].head}: ${r.text}`, 'ai')
      }
      return { type: 'tool_result', tool_use_id: u.id, content: r.text, is_error: !r.ok }
    })
    messages.push({ role: 'user', content: results })
    text = ''
  }
  return { text: text.trim() || (actions.length ? '요청하신 대로 처리했어요.' : '…'), actions, usage }
}

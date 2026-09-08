type CharacterController = { setState: (pose: AlicePose) => void; say: (text: string) => void }; 
import type { AlicePose } from '@/models/alice/alice-character';
import { ALICE_POSES } from './alice-poses';

// Optional WebMCP adapter. The same controller powers the visible interface.
export function registerCharacterTool(controller: CharacterController) {
  type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => Promise<object> };
  const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(context.registerTool({
      name: 'set_character_state', title: '控制有珠',
      description: '切换网页角色的姿势，可选展示一句文字并播放已有嘴型。无语音、无消息发送。',
      inputSchema: { type: 'object', properties: { state: { type: 'string', enum: ALICE_POSES }, text: { type: 'string', minLength: 1, maxLength: 100 } }, required: ['state'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('参数必须是对象。');
        const value = input as Record<string, unknown>;
        if (Object.keys(value).some(key => key !== 'state' && key !== 'text')) throw new Error('包含未知参数。');
        if (!(ALICE_POSES as readonly AlicePose[]).includes(value.state as AlicePose)) throw new Error('未知姿势。');
        if (value.text !== undefined && (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 100)) throw new Error('文字须为 1 至 100 个字符。');
        if (lifecycle.signal.aborted) throw new Error('页面已关闭。');
        controller.setState(value.state as AlicePose);
        if (typeof value.text === 'string') controller.say(value.text);
        await new Promise(resolve => setTimeout(resolve, 360));
        return { state: value.state, text: typeof value.text === 'string' ? value.text.trim() : null };
      },
    }, { signal: lifecycle.signal })).catch(() => { /* Optional experimental browser API. */ });
  } catch { /* Standard browsers still use the UI and window.character. */ }
  return () => lifecycle.abort();
}

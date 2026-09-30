// Descrição de imagem GRATUITA com Workers AI (Cloudflare): Gemma 4 do Google, com visão,
// português e leitura de texto. Cabe na cota gratuita diária da Cloudflare (10.000 neurons,
// ~400 fotos/dia). Acima disso, só no plano Workers Paid, a ~US$ 0,0002 por foto.
import { MODE_HINT, normalizeResult, NotDescribableError, SYSTEM_PROMPT, targetHint, type Mode, type SceneResult } from './describe.ts';

export const FREE_MODEL = '@cf/google/gemma-4-26b-a4b-it';

const JSON_INSTRUCTIONS = `Reply with ONLY one JSON object, no markdown, with exactly these keys:
{"identified": string, "description": string, "environment": string, "action": string, "colors": string, "hazards": string[], "confidence": "high" | "medium" | "low"}`;

interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

function extractText(res: unknown): string {
  const r = res as { response?: unknown; choices?: { message?: { content?: string } }[] };
  if (typeof r?.response === 'string') return r.response;
  if (r?.response && typeof r.response === 'object') return JSON.stringify(r.response);
  return r?.choices?.[0]?.message?.content ?? '';
}

/** Pega o primeiro objeto JSON da resposta (modelos às vezes cercam com texto). */
export function parseSceneJson(text: string): SceneResult {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return normalizeResult(JSON.parse(text.slice(start, end + 1)));
    } catch {
      // cai no texto simples abaixo
    }
  }
  const plain = text.replace(/[*#`]/g, '').trim();
  if (!plain) throw new NotDescribableError('empty');
  return normalizeResult({ identified: plain.slice(0, 400), confidence: 'medium' });
}

export async function describeImageFree(
  ai: AiBinding,
  model: string,
  imageBase64: string,
  mode: Mode,
  locale: string,
  target?: string,
): Promise<SceneResult> {
  const res = await ai.run(model, {
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTIONS}` },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: `${MODE_HINT[mode]} Write every field in this language: ${locale}.${targetHint(target)}` },
        ],
      },
    ],
    max_tokens: mode === 'walk' ? 250 : 600,
    temperature: 0.2,
    chat_template_kwargs: { enable_thinking: false },
  });
  return parseSceneJson(extractText(res));
}

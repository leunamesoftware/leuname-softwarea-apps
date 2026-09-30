import Anthropic from '@anthropic-ai/sdk';

export type Mode = 'walk' | 'object' | 'person' | 'environment';

export interface SceneResult {
  identified: string;
  description: string;
  environment: string;
  action: string;
  colors: string;
  hazards: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Esquema da resposta: garante JSON válido e sempre no mesmo formato para o app.
const SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['identified', 'description', 'environment', 'action', 'colors', 'hazards', 'confidence'],
  properties: {
    identified: { type: 'string', description: 'Uma frase curta com o principal elemento. Vazio se não for possível identificar.' },
    description: { type: 'string' },
    environment: { type: 'string' },
    action: { type: 'string' },
    colors: { type: 'string' },
    hazards: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
} as const;

const SYSTEM_PROMPT = `You describe photos for people who are blind or have low vision, inside the accessibility app Lerguie. The person is holding the phone camera, so "left", "right" and "in front" are relative to the camera. Your words are read aloud by a screen reader, so write short, plain sentences with no markdown.

Honesty matters more than completeness: a wrong description can mislead someone who cannot check it. Describe only what is visible. When you are not sure what something is, say so and lower "confidence" instead of guessing. If the image is too dark, blurred or unclear to describe safely, return an empty "identified" and "low" confidence.

Fields:
- identified: one sentence naming the main subject precisely (the specific object, e.g. "chinelo" rather than "calçado"; "parede" when facing a wall) (e.g. "É um cachorro da raça Golden Retriever."). Mention the breed, brand or model only when clearly recognizable.
- description: up to three sentences with the most useful details: size, position (left/right/in front, near/far), state, and any text that is visible and relevant.
- environment: one sentence about the place, or empty.
- action: one sentence about what is happening, or empty.
- colors: one sentence with the main colors, or empty.
- hazards: short, direct warnings only for risks that are actually visible and relevant to someone walking or reaching out: stairs or steps, holes, obstacles in the path, vehicles or bicycles close by, sharp or hot objects, fire, wet floor, open doors at head height. Empty list when there is no visible risk.
- confidence: "high", "medium" or "low".

About people: never identify anyone by name and never guess identity, ethnicity, health, religion or other sensitive traits. You may describe approximate age range, clothing, posture, facial expression and what the person is doing.`;

const MODE_HINT: Record<Mode, string> = {
  walk: 'The person is WALKING with the camera pointing ahead. Be very brief: "identified" is one short sentence about the path ahead (e.g. "Corredor livre à frente, porta à direita a cerca de 3 metros."). Mention doors, walls, stairs, curbs, poles, obstacles, people and vehicles with side and approximate distance in meters. Leave description, environment, action and colors empty.',
  object: 'Focus on the main object or animal in the center of the image.',
  person: 'Focus on the people in the image, following the rules about people.',
  environment: 'Focus on the overall place: layout, main objects and where they are, paths and obstacles.',
};

export class NotDescribableError extends Error {}

export async function describeImage(
  apiKey: string,
  model: string,
  imageBase64: string,
  mode: Mode,
  locale: string,
  target?: string,
): Promise<SceneResult> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 40_000 });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 4096,
    // Recusas por política: reencaminha automaticamente para um modelo de fallback.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Descrição curta: esforço baixo = resposta rápida e barata.
    // Foto: esforço médio (mais precisão). Caminhar: baixo (resposta rápida).
    output_config: { effort: mode === 'walk' ? 'low' : 'medium', format: { type: 'json_schema', schema: SCENE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          {
            type: 'text',
            text:
              `${MODE_HINT[mode]} Write every field in this language: ${locale}.` +
              (target
                ? ` The person is looking for this item: "${target}". Start "identified" by saying clearly whether it is visible and exactly where (left/right/center, shelf height, approximate distance). If it is not visible, say so and suggest turning slowly. Never claim it is visible unless you can see it.`
                : ''),
          },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') throw new NotDescribableError(response.stop_reason);
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new NotDescribableError('no_text');
  const parsed = JSON.parse(text.text) as SceneResult;
  return {
    identified: String(parsed.identified ?? ''),
    description: String(parsed.description ?? ''),
    environment: String(parsed.environment ?? ''),
    action: String(parsed.action ?? ''),
    colors: String(parsed.colors ?? ''),
    hazards: Array.isArray(parsed.hazards) ? parsed.hazards.map(String).slice(0, 3) : [],
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
  };
}

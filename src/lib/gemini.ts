const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const GEMINI_AVAILABLE = Boolean(GEMINI_API_KEY);

export interface GeminiAnalysis {
  category: string;
  recyclable: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, data] = dataUrl.split(',');
      resolve({ data, mimeType: header.match(/:(.*?);/)?.[1] ?? 'image/jpeg' });
    };
    reader.readAsDataURL(blob);
  });
}

const PROMPT =
  'You are a waste classification expert for a Malaysian household recycling app. ' +
  'Examine this image and identify the waste material. ' +
  'Choose EXACTLY ONE category from: Battery, Biological, Cardboard, Clothes, Glass, Metal, Paper, Plastic, Shoes, Trash. ' +
  'Return ONLY a valid JSON object with no extra text: ' +
  '{"category":"<class>","recyclable":<true|false>,"confidence":"<High|Medium|Low>","reason":"<one sentence>"}';

export async function analyzeWithGemini(imageUrl: string): Promise<GeminiAnalysis> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured.');

  const { data, mimeType } = imageUrl.startsWith('data:')
    ? { data: imageUrl.split(',')[1], mimeType: imageUrl.match(/:(.*?);/)?.[1] ?? 'image/jpeg' }
    : await urlToBase64(imageUrl);

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data } },
          { text: PROMPT },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Empty Gemini response');

  try {
    return JSON.parse(text) as GeminiAnalysis;
  } catch {
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error(`No JSON in response: ${text.slice(0, 120)}`);
    return JSON.parse(match[0]) as GeminiAnalysis;
  }
}

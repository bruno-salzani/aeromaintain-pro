import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { config } from '../config.js';

export const router = Router();

router.post('/extract-maintenance', async (req, res) => {
  try {
    const schema = z.object({ base64Pdf: z.string().min(1) });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'base64Pdf obrigatório' });
    if (!config.geminiApiKey) return res.status(500).json({ error: 'API key ausente' });
    const { base64Pdf } = parsed.data;
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Pdf
              }
            },
            {
              text: 'Extract maintenance tasks, expired components, and upcoming inspections from this aviation maintenance planning report. Return a structured JSON list of tasks including description, ATA, credit/remaining, and priority.'
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              ata: { type: Type.STRING },
              category: { type: Type.STRING, description: 'component, task, or document' },
              status: { type: Type.STRING, description: 'expired, critical, warning, ok' },
              remainingCredit: { type: Type.STRING },
              priority: { type: Type.STRING }
            },
            required: ['description', 'status']
          }
        }
      }
    });
    const data = JSON.parse(response.text || '[]');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Falha na análise do PDF' });
  }
});

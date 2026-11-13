import type { AiRequest, AiPlan } from '../../supabase/functions/_shared/ai/contracts';
import { aiConfig } from '../../supabase/functions/_shared/ai/config';
export const testAiConfig = aiConfig({
  GEMINI_API_KEY: 'server-only-synthetic-credential',
  AI_DEVELOPMENT_TOKEN: 'development-fixture-capability-'.repeat(2),
  FUNCTION_ALLOWED_ORIGINS: 'http://localhost:5173',
});
export function aiInput(operation: AiRequest['operation'] = 'trip'): AiRequest {
  return {
    requestId: crypto.randomUUID(),
    clientId: crypto.randomUUID(),
    operation,
    context: {
      destination: 'Kyoto',
      country: 'Japan',
      dates: ['2030-03-20', '2030-03-21'],
      travelers: 2,
      budgetMinor: 120000,
      currency: 'USD',
      interests: ['Culture', 'Nature'],
      pace: 'Relaxed',
      existing: [],
      places: [],
    },
    instruction: 'A slow cultural trip',
    messages:
      operation === 'chat' ? [{ role: 'user', text: 'How can we have a quieter day?' }] : [],
    consent: true,
  };
}
export function aiPlan(dates = ['2030-03-20', '2030-03-21']): AiPlan {
  return {
    summary: 'A synthetic AI draft for deterministic review; not a real Gemini response.',
    days: dates.map((date, i) => ({
      date,
      activities: [
        {
          title: i ? 'A quiet neighbourhood' : 'A garden afternoon',
          description: 'Unverified test suggestion; leave time to explore slowly.',
          durationMinutes: 75,
          startTime: null,
          category: 'Culture',
          locationName: 'Location to confirm',
          placeIndex: null,
        },
      ],
    })),
  };
}

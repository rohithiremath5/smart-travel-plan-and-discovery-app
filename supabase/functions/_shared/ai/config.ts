import { plannerModel, assistantModel } from './contracts.ts';
import { aiTimeouts, validAiTimeouts } from './timeouts.ts';
export interface AiConfig {
  apiKey: string;
  model: string;
  chatModel: string;
  dailyBudget: number;
  clientBudget: number;
  developmentToken: string;
  origins: string[];
  timeouts: ReturnType<typeof aiTimeouts>;
}
export function aiConfig(env: Record<string, string | undefined>): AiConfig {
  return {
    apiKey: env.GEMINI_API_KEY ?? '',
    timeouts: aiTimeouts(Number(env.AI_PROVIDER_TIMEOUT_MS ?? '75000')),
    model: env.GEMINI_MODEL ?? plannerModel,
    chatModel: env.GEMINI_CHAT_MODEL ?? assistantModel,
    dailyBudget: Number(env.AI_DAILY_REQUEST_BUDGET ?? '5'),
    clientBudget: Number(env.AI_REQUESTS_PER_USER_PER_DAY ?? '3'),
    developmentToken: env.AI_DEVELOPMENT_TOKEN ?? '',
    origins: (env.FUNCTION_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  };
}
export function configurationIssue(config: AiConfig): string | null {
  if (!validAiTimeouts(config.timeouts)) return 'ai_disabled';
  if (!config.apiKey) return 'missing_key';
  if (config.model !== plannerModel || config.chatModel !== assistantModel)
    return 'model_unavailable';
  if (
    !Number.isInteger(config.dailyBudget) ||
    config.dailyBudget < 1 ||
    config.dailyBudget > 5 ||
    !Number.isInteger(config.clientBudget) ||
    config.clientBudget < 1 ||
    config.clientBudget > 3
  )
    return 'ai_disabled';
  return null;
}

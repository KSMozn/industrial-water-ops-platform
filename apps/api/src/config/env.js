import "dotenv/config";

const required = (key, fallback) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var ${key}`);
  return v;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  host: process.env.API_HOST ?? "0.0.0.0",
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: required("DATABASE_URL", "postgresql://waterops:waterops@localhost:5432/waterops?schema=public"),
  ai: {
    provider: process.env.AI_PROVIDER ?? "mock",
    model: process.env.AI_MODEL ?? "claude-sonnet-4-6",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  },
};

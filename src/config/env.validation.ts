import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  BACKEND_PORT: z.string().transform(Number).default('3000'),
  FRONTEND_PORT: z.string().transform(Number).default('5173'),
  FRONTEND_URL: z.string().url(),
  SOCKET_PATH: z.string().default('/smartchatbot'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_ORGANIZATION_ID: z.string().optional(),

  // Google APIs
  GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),
  GOOGLE_LIBRARY_SEARCH_CSE_ID: z
    .string()
    .min(1, 'GOOGLE_LIBRARY_SEARCH_CSE_ID is required'),

  // LibCal
  LIBCAL_OAUTH_URL: z.string().url(),
  LIBCAL_CLIENT_ID: z.string().min(1, 'LIBCAL_CLIENT_ID is required'),
  LIBCAL_CLIENT_SECRET: z.string().min(1, 'LIBCAL_CLIENT_SECRET is required'),
  LIBCAL_GRANT_TYPE: z.string().default('client_credentials'),
  LIBCAL_SEARCH_AVAILABLE_URL: z.string().url(),
  LIBCAL_ROOM_INFO_URL: z.string().url(),
  LIBCAL_RESERVATION_URL: z.string().url(),
  LIBCAL_CANCEL_URL: z.string().url(),
  LIBCAL_HOUR_URL: z.string().url(),
  KING_BUILDING: z.string().min(1, 'KING_BUILDING is required'),

  // LibApps
  LIBAPPS_OAUTH_URL: z.string().url(),
  LIBAPPS_CLIENT_ID: z.string().min(1, 'LIBAPPS_CLIENT_ID is required'),
  LIBAPPS_CLIENT_SECRET: z.string().min(1, 'LIBAPPS_CLIENT_SECRET is required'),
  LIBAPPS_GRANT_TYPE: z.string().default('client_credentials'),

  // LibAnswers
  LIB_ANS_CLIENT_ID: z.string().min(1, 'LIB_ANS_CLIENT_ID is required'),
  LIB_ANS_CLIENT_SECRET: z.string().min(1, 'LIB_ANS_CLIENT_SECRET is required'),
  LIB_ANS_OAUTH_URL: z.string().url(),
  LIB_ANS_GRANT_TYPE: z.string().default('client_credentials'),
  QUEUE_ID: z.string().min(1, 'QUEUE_ID is required'),

  // Weaviate
  WEAVIATE_API_KEY: z.string().min(1, 'WEAVIATE_API_KEY is required'),

  // EBSCO (Legacy - TODO: Switch to PRIMO)
  EBSCO_USER_ID: z.string().optional(),
  EBSCO_USER_PASSWORD: z.string().optional(),
  EBSCO_USER_PROFILE: z.string().optional(),
  END_SESSION_URL: z.string().url().optional(),
  SEARCH_URL: z.string().url().optional(),
  AUTH_URL: z.string().url().optional(),
  SESSION_URL: z.string().url().optional(),

  // PRIMO
  PRIMO_SCOPE: z.string().optional(),
  PRIMO_API_KEY: z.string().optional(),
  PRIMO_SEARCH_URL: z.string().url().optional(),
  PRIMO_VID: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      );
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}`,
      );
    }
    throw error;
  }
}

/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

// Only load dotenv if not in test environment (vitest.config.ts handles it)
if (process.env.NODE_ENV !== "test") {
  expand(config({
    path: path.resolve(
      process.cwd(),
      process.env.NODE_ENV === "test" ? ".env.test" : ".env",
    ),
  }));
}

const stringBoolean = z.coerce.string().transform((val) => {
    return val === "true";
  }).default(false);

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
  BASE_URL: z.string().url().or(z.string().default("http://localhost:2222")),
  DATABASE_URL: z.string().url().or(z.string().default("postgres://localhost:5432/test")),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("test"),
  DB_PORT: z.string().default("5432"),
  // IS_CLOUD: z.boolean().default(false),
  DB_MIGRATING: stringBoolean,
  DB_SEEDING: stringBoolean,
});

export type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;

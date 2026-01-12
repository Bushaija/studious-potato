import { config } from "dotenv";
import { expand } from "dotenv-expand";

import { z } from "zod";

const stringBoolean = z.coerce.string().transform((val) => {
  return val === "true";
}).default("false");

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(2222),
  LOG_LEVEL: z.string().default("info"),
  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_PORT: z.coerce.number(),
  DATABASE_URL: z.string(),
  NEXT_API_URL: z.string(),
  DB_MIGRATING: stringBoolean,
  DB_SEEDING: stringBoolean,
  BETTER_AUTH_SECRET: z.string().default("dev-secret-change-me"),
});

// export type EnvSchema = z.infer<typeof EnvSchema>;

expand(config());


// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;

// Parse once to surface type-safe values with defaults applied.
// export default EnvSchema.parse(process.env);

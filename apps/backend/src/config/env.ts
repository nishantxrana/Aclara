import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

function numberWithDefault(defaultValue: number) {
  return z.preprocess((val: unknown) => {
    if (val === undefined || val === "") {
      return defaultValue;
    }
    return val;
  }, z.coerce.number().finite());
}

const LogLevelSchema = z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]);
const LogFormatSchema = z.enum(["json", "pretty"]);

const envSchema = z
  .object({
    AZURE_DEVOPS_ORG: z.string().min(1, "AZURE_DEVOPS_ORG is required"),
    AZURE_DEVOPS_PAT: z.string().min(1, "AZURE_DEVOPS_PAT is required"),
    PORT: numberWithDefault(3001),
    NODE_ENV: z.preprocess(
      (v: unknown) => (v === undefined || v === "" ? "development" : v),
      z.enum(["development", "production", "test"])
    ),
    CORS_ORIGIN: z.preprocess(
      (v: unknown) => (v === undefined || v === "" ? "http://localhost:5173" : v),
      z.string()
    ),
    CACHE_TTL_GROUPS: numberWithDefault(300),
    CACHE_TTL_USERS: numberWithDefault(300),
    CACHE_TTL_ACLS: numberWithDefault(120),
    LOG_LEVEL: z
      .preprocess(
        (v: unknown) =>
          v === undefined || v === "" ? undefined : String(v).trim().toUpperCase(),
        LogLevelSchema.optional()
      )
      .optional(),
    LOG_FORMAT: z
      .preprocess(
        (v: unknown) =>
          v === undefined || v === "" ? undefined : String(v).trim().toLowerCase(),
        LogFormatSchema.optional()
      )
      .optional(),
  })
  .transform((data) => {
    const logLevel =
      data.LOG_LEVEL ??
      (data.NODE_ENV === "production" ? ("INFO" as const) : ("DEBUG" as const));
    const logFormat =
      data.LOG_FORMAT ??
      (data.NODE_ENV === "production" ? ("json" as const) : ("pretty" as const));
    return {
      ...data,
      LOG_LEVEL: logLevel,
      LOG_FORMAT: logFormat,
    };
  });

function collectMissingRequiredEnv(): string[] {
  const missing: string[] = [];
  const org = process.env.AZURE_DEVOPS_ORG;
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (org === undefined || org.trim() === "") {
    missing.push("AZURE_DEVOPS_ORG");
  }
  if (pat === undefined || pat.trim() === "") {
    missing.push("AZURE_DEVOPS_PAT");
  }
  return missing;
}

function parseEnv(): z.infer<typeof envSchema> {
  const missingRequired = collectMissingRequiredEnv();
  if (missingRequired.length > 0) {
    const lines = missingRequired.map((key) => `  - ${key}`).join("\n");
    throw new Error(`Missing required environment variables:\n${lines}`);
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Invalid environment configuration:\n${JSON.stringify(fieldErrors, null, 2)}`
    );
  }

  return parsed.data;
}

export const config = parseEnv();

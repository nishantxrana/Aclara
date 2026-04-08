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
    AZURE_DEVOPS_ORG: z.string().optional(),
    AZURE_DEVOPS_PAT: z.string().optional(),
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
    SESSION_COOKIE_NAME: z.preprocess(
      (v: unknown) => (v === undefined || v === "" ? "aclara_sid" : v),
      z.string().min(1)
    ),
    SESSION_MAX_AGE_SECONDS: numberWithDefault(86_400),
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
    const orgTrim =
      data.AZURE_DEVOPS_ORG !== undefined ? data.AZURE_DEVOPS_ORG.trim() : "";
    const patTrim =
      data.AZURE_DEVOPS_PAT !== undefined ? data.AZURE_DEVOPS_PAT.trim() : "";
    return {
      ...data,
      LOG_LEVEL: logLevel,
      LOG_FORMAT: logFormat,
      AZURE_DEVOPS_ORG: orgTrim.length > 0 ? orgTrim : null,
      AZURE_DEVOPS_PAT: patTrim.length > 0 ? patTrim : null,
    };
  });

function parseEnv(): z.infer<typeof envSchema> {
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

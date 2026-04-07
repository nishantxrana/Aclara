import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { config as appConfig } from "@/config/env";

type RetryableConfig = InternalAxiosRequestConfig & { __retryCount?: number };

interface PaginatedValue<T> {
  value?: T[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfterMs(headers: Record<string, unknown> | undefined): number | null {
  if (headers === undefined) {
    return null;
  }
  const raw =
    headers["retry-after"] ??
    headers["Retry-After"] ??
    headers["retry-after".toLowerCase()];
  if (raw === undefined || raw === null) {
    return null;
  }
  const s = String(raw).trim();
  const seconds = Number.parseInt(s, 10);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return seconds * 1000;
}

export class AzureDevOpsClient {
  private readonly authHeader: string;
  private readonly baseUrl: string;
  private readonly graphUrl: string;
  private readonly entitlementUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(params: { org: string; pat: string }) {
    const { org, pat } = params;
    this.authHeader = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
    this.baseUrl = `https://dev.azure.com/${org}`;
    this.graphUrl = `https://vssps.dev.azure.com/${org}`;
    this.entitlementUrl = `https://vsaex.dev.azure.com/${org}`;

    this.axiosInstance = axios.create({
      baseURL: "",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: this.authHeader,
      },
      timeout: 30000,
      validateStatus: (status: number) => status >= 200 && status < 300,
    });

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (appConfig.NODE_ENV === "development") {
          const url =
            response.config.baseURL !== undefined && response.config.baseURL !== ""
              ? `${response.config.baseURL}${response.config.url ?? ""}`
              : response.config.url ?? "";
          console.log(`[AzureDevOpsClient] ${String(response.status)} ${url}`);
        }
        return response;
      },
      async (error: unknown) => {
        if (!axios.isAxiosError(error) || error.config === undefined) {
          throw error;
        }

        const axiosError = error;
        const status = axiosError.response?.status;
        const cfg = axiosError.config as RetryableConfig;
        const retryCount = cfg.__retryCount ?? 0;
        const maxRetries = 3;

        if (status === 429 && retryCount < maxRetries) {
          cfg.__retryCount = retryCount + 1;
          const fromHeader = parseRetryAfterMs(
            axiosError.response?.headers as Record<string, unknown> | undefined
          );
          const backoffMs = [1000, 2000, 4000][retryCount] ?? 4000;
          const waitMs = fromHeader ?? backoffMs;
          await sleep(waitMs);
          return this.axiosInstance.request(cfg);
        }

        if (appConfig.NODE_ENV === "development" && axiosError.config !== undefined) {
          const c = axiosError.config;
          const url =
            c.baseURL !== undefined && c.baseURL !== ""
              ? `${c.baseURL}${c.url ?? ""}`
              : c.url ?? "";
          const st = axiosError.response?.status ?? "ERR";
          console.log(`[AzureDevOpsClient] ${String(st)} ${url}`);
        }

        throw axiosError;
      }
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getGraphUrl(): string {
    return this.graphUrl;
  }

  getEntitlementUrl(): string {
    return this.entitlementUrl;
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, body);
    return response.data;
  }

  async paginate<T>(url: string, params?: Record<string, string>): Promise<T[]> {
    const results: T[] = [];
    let continuationToken: string | undefined;

    for (;;) {
      const requestParams: Record<string, string> = {
        ...(params ?? {}),
        ...(continuationToken !== undefined
          ? { continuationToken }
          : {}),
      };

      const response = await this.axiosInstance.get<PaginatedValue<T>>(url, {
        params: requestParams,
      });

      const chunk = response.data.value ?? [];
      results.push(...chunk);

      const rawNext =
        response.headers["x-ms-continuationtoken"] ??
        response.headers["x-ms-continuationToken"];
      const next =
        rawNext !== undefined && rawNext !== null && rawNext !== ""
          ? String(rawNext)
          : undefined;

      if (next === undefined) {
        break;
      }
      continuationToken = next;
    }

    return results;
  }
}

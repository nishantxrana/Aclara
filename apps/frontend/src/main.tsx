import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createLogger } from "@/utils/logger";

import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

const rqLog = createLogger("react-query");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1_800_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      rqLog.error("query.cache_error", {
        queryKey: query.queryKey,
        message: error instanceof Error ? error.message : String(error),
      });
    },
  }),
});

document.documentElement.classList.add("dark");

const rootEl = document.getElementById("root");
if (rootEl === null) {
  throw new Error('Root element with id "root" not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

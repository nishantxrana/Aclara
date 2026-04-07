import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import {
  QUERY_KEYS,
  connectSession,
  useSessionStatus,
  type ApiHttpError,
} from "@/api/insightops.api";
import {
  clearVaultFromLocalStorage,
  decryptCredentials,
  encryptCredentials,
  readVaultFromLocalStorage,
  writeVaultToLocalStorage,
} from "@/lib/credentialVault";

export function ConnectScreen(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionStatus = useSessionStatus();
  const [org, setOrg] = useState("");
  const [pat, setPat] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [remember, setRemember] = useState(false);
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const vaultPresent = readVaultFromLocalStorage() !== null;

  const connectMutation = useMutation({
    mutationFn: async () => {
      await connectSession({ org: org.trim(), pat });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionStatus });
    },
    onSuccess: async () => {
      if (remember && passphrase.trim().length > 0) {
        const payload = await encryptCredentials(
          { org: org.trim(), pat },
          passphrase
        );
        writeVaultToLocalStorage(payload);
      }
      navigate("/workspace", { replace: true });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const raw = readVaultFromLocalStorage();
      if (raw === null) {
        throw new Error("No saved credentials on this device.");
      }
      const creds = await decryptCredentials(raw, unlockPassphrase);
      await connectSession({ org: creds.org, pat: creds.pat });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionStatus });
    },
    onSuccess: () => {
      setUnlockError(null);
      navigate("/workspace", { replace: true });
    },
    onError: (e: unknown) => {
      setUnlockError(e instanceof Error ? e.message : "Could not unlock saved credentials.");
    },
  });

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    connectMutation.reset();
    connectMutation.mutate();
  };

  const errMsg =
    connectMutation.error instanceof Error ? connectMutation.error.message : null;
  const apiRequestId =
    connectMutation.error !== null &&
    typeof connectMutation.error === "object" &&
    "requestId" in connectMutation.error
      ? (connectMutation.error as ApiHttpError).requestId
      : undefined;

  if (sessionStatus.isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface text-sm text-slate-400">
        Checking connection…
      </div>
    );
  }

  if (sessionStatus.data?.connected === true) {
    return <Navigate replace to="/workspace" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-100">
      <header className="border-b border-surface-light px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-primary">InsightOps</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-400">
          Connect with an Azure DevOps organization name and a Personal Access Token (PAT). Tokens
          are sent to your local backend only and are not stored in browser memory unless you
          explicitly enable encrypted local storage below.
        </p>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-10">
        <section
          aria-labelledby="connect-heading"
          className="rounded-lg border border-surface-light bg-surface-light/20 p-6"
        >
          <h2 className="text-sm font-semibold text-slate-200" id="connect-heading">
            Connect to Azure DevOps
          </h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="org">
                Organization name
              </label>
              <input
                autoComplete="organization"
                className="mt-1 w-full rounded-md border border-surface-light bg-surface px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                id="org"
                onChange={(e) => {
                  setOrg(e.target.value);
                }}
                placeholder="e.g. contoso"
                required
                type="text"
                value={org}
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="pat">
                Personal Access Token
              </label>
              <input
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-surface-light bg-surface px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                id="pat"
                onChange={(e) => {
                  setPat(e.target.value);
                }}
                placeholder="PAT with Code (read) + Graph (read)"
                required
                type="password"
                value={pat}
              />
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100/90">
              <p className="font-medium text-amber-200">Security recommendations</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100/80">
                <li>Use a short-lived PAT and rotate it after audits.</li>
                <li>Minimum scopes: Code (read), Graph (read), Project and team (read).</li>
                <li>The PAT is held in an HttpOnly session cookie flow via your local API — never embedded in the SPA bundle.</li>
              </ul>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                checked={remember}
                className="mt-1"
                onChange={(e) => {
                  setRemember(e.target.checked);
                }}
                type="checkbox"
              />
              <span>
                Remember encrypted org + PAT on this device (requires a passphrase; uses WebCrypto
                AES-GCM + PBKDF2 in the browser).
              </span>
            </label>
            {remember ? (
              <div>
                <label
                  className="text-xs font-medium uppercase tracking-wide text-slate-500"
                  htmlFor="passphrase"
                >
                  Passphrase
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-surface-light bg-surface px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                  id="passphrase"
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                  }}
                  type="password"
                  value={passphrase}
                />
              </div>
            ) : null}
            {errMsg !== null ? (
              <p className="text-sm text-red-400" role="alert">
                {errMsg}
                {apiRequestId !== undefined ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    Request ID: {apiRequestId}
                  </span>
                ) : null}
              </p>
            ) : null}
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              disabled={connectMutation.isPending}
              type="submit"
            >
              {connectMutation.isPending ? "Connecting…" : "Connect"}
            </button>
          </form>
        </section>

        {vaultPresent ? (
          <section className="rounded-lg border border-surface-light bg-surface-light/20 p-6">
            <h2 className="text-sm font-semibold text-slate-200">Unlock saved credentials</h2>
            <p className="mt-1 text-xs text-slate-500">
              If you previously saved an encrypted vault on this browser, enter your passphrase to
              reconnect without retyping your PAT.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="w-full rounded-md border border-surface-light bg-surface px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                onChange={(e) => {
                  setUnlockPassphrase(e.target.value);
                }}
                placeholder="Passphrase"
                type="password"
                value={unlockPassphrase}
              />
              {unlockError !== null ? (
                <p className="text-xs text-red-400" role="alert">
                  {unlockError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-surface-light px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-surface-light/40 disabled:opacity-40"
                  disabled={unlockMutation.isPending || unlockPassphrase.length === 0}
                  onClick={() => {
                    unlockMutation.mutate();
                  }}
                  type="button"
                >
                  {unlockMutation.isPending ? "Unlocking…" : "Unlock & connect"}
                </button>
                <button
                  className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    clearVaultFromLocalStorage();
                    window.location.reload();
                  }}
                  type="button"
                >
                  Clear saved vault
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

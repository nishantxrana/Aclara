import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import {
  QUERY_KEYS,
  connectSession,
  useSessionStatus,
  type ApiHttpError,
} from "@/api/aclara.api";
import { ThemeToggle } from "@/components/Layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { uxEvent } from "@/lib/uxTelemetry";
import {
  clearVaultFromLocalStorage,
  decryptCredentials,
  encryptCredentials,
  readVaultFromLocalStorage,
  writeVaultToLocalStorage,
} from "@/lib/credentialVault";

const fieldClass =
  "mt-1 w-full min-h-[44px] rounded-input border border-line-default bg-panel px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

const panelClass =
  "rounded-panel border border-line-soft bg-panel p-6 shadow-panel-md";

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
  const [showManualConnect, setShowManualConnect] = useState(false);
  const vaultPresent = readVaultFromLocalStorage() !== null;

  const connectMutation = useMutation({
    mutationFn: async () => {
      await connectSession({ org: org.trim(), pat });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionStatus });
    },
    onSuccess: async () => {
      uxEvent("connect_success", { remember: remember && passphrase.trim().length > 0 });
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
      uxEvent("connect_unlock_success", {});
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-ink-primary">
        <p className="text-lg font-semibold tracking-tight text-brand-primary">Aclara</p>
        <p className="mt-3 text-sm text-ink-secondary">Checking connection…</p>
      </div>
    );
  }

  if (sessionStatus.data?.connected === true) {
    return <Navigate replace to="/workspace" />;
  }

  const showVaultPrimary = vaultPresent && !showManualConnect;

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink-primary">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft bg-panel px-6 py-4 shadow-panel">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Aclara</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-secondary">
            Connect to Azure DevOps to map Git access, group membership, and permission paths in your
            projects.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
        {showVaultPrimary ? (
          <section aria-labelledby="unlock-heading" className={panelClass}>
            <h2 className="text-sm font-semibold text-ink-primary" id="unlock-heading">
              Welcome back
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Unlock your saved encrypted credentials on this browser to reconnect without retyping
              your PAT.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="sr-only" htmlFor="unlock-pass">
                Passphrase
              </label>
              <input
                className={fieldClass}
                id="unlock-pass"
                onChange={(e) => {
                  setUnlockPassphrase(e.target.value);
                }}
                placeholder="Passphrase"
                type="password"
                value={unlockPassphrase}
              />
              {unlockError !== null ? (
                <p className="text-xs text-status-danger" role="alert">
                  {unlockError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={unlockMutation.isPending || unlockPassphrase.length === 0}
                  onClick={() => {
                    unlockMutation.mutate();
                  }}
                  type="button"
                >
                  {unlockMutation.isPending ? "Unlocking…" : "Unlock & connect"}
                </Button>
                <Button
                  onClick={() => {
                    setShowManualConnect(true);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Use different organization or PAT
                </Button>
                <Button
                  onClick={() => {
                    clearVaultFromLocalStorage();
                    window.location.reload();
                  }}
                  type="button"
                  variant="danger"
                >
                  Clear saved vault
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {!vaultPresent || showManualConnect ? (
          <section aria-labelledby="connect-heading" className={panelClass}>
            <h2 className="text-sm font-semibold text-ink-primary" id="connect-heading">
              Connect to Azure DevOps
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Tokens are sent to your local backend only. Optional encrypted storage uses WebCrypto
              in the browser when you opt in below.
            </p>
            <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
              <div>
                <label className="text-label text-ink-tertiary" htmlFor="org">
                  Organization name
                </label>
                <input
                  autoComplete="organization"
                  className={fieldClass}
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
                <label className="text-label text-ink-tertiary" htmlFor="pat">
                  Personal Access Token
                </label>
                <input
                  autoComplete="off"
                  className={fieldClass}
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
              <details className="rounded-input border border-status-warning/35 bg-status-warning-soft p-3 text-xs text-ink-on-warning-soft">
                <summary className="cursor-pointer font-medium text-ink-on-warning-soft">
                  Security recommendations
                </summary>
                <ul className="mt-2 list-inside list-disc space-y-1 text-ink-on-warning-soft/90">
                  <li>Use a short-lived PAT and rotate it after audits.</li>
                  <li>Minimum scopes: Code (read), Graph (read), Project and team (read).</li>
                  <li>The PAT is held in an HttpOnly session via your local API — not embedded in the SPA.</li>
                </ul>
              </details>
              <label className="flex items-start gap-2 text-sm text-ink-secondary">
                <input
                  checked={remember}
                  className="mt-1 rounded border-line-default text-brand-primary focus:ring-brand-primary/30"
                  onChange={(e) => {
                    setRemember(e.target.checked);
                  }}
                  type="checkbox"
                />
                <span>
                  Remember encrypted org + PAT on this device (passphrase + WebCrypto AES-GCM +
                  PBKDF2).
                </span>
              </label>
              {remember ? (
                <div>
                  <label className="text-label text-ink-tertiary" htmlFor="passphrase">
                    Passphrase
                  </label>
                  <input
                    className={fieldClass}
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
                <p className="text-sm text-status-danger" role="alert">
                  {errMsg}
                  {apiRequestId !== undefined ? (
                    <span className="mt-1 block text-xs text-ink-tertiary">
                      Request ID: {apiRequestId}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <Button disabled={connectMutation.isPending} type="submit">
                {connectMutation.isPending ? "Connecting…" : "Connect"}
              </Button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}

"use client";

import type { Account } from "@cardboard/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboardingPreferenceKey } from "./portfolio-onboarding";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type LifecycleAction =
  | { method: "POST"; path: "/v1/account/export-requests" }
  | { method: "POST"; path: "/v1/account/deletion-requests" }
  | { method: "DELETE"; path: "/v1/account/deletion-requests" };

async function callLifecycle(action: LifecycleAction): Promise<boolean> {
  const response = await fetch(`${apiUrl}${action.path}`, {
    method: action.method,
    headers: { "x-mock-user-id": "demo-user" },
  });
  return response.ok;
}

export function ExportRequestAction({ account }: { account: Account }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (account.exportRequest) {
    return (
      <p className="lifecycle-status" role="status">
        <span className="pill pill-positive">Requested</span> Export requested{" "}
        <time dateTime={account.exportRequest.requestedAt}>
          {longDate(account.exportRequest.requestedAt)}
        </time>
        . You will be notified when the file is ready.
      </p>
    );
  }

  return (
    <div className="lifecycle-action">
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const ok = await callLifecycle({
            method: "POST",
            path: "/v1/account/export-requests",
          });
          if (!ok) setError("The export request could not be recorded.");
          setBusy(false);
          router.refresh();
        }}
        type="button"
      >
        Request data export
      </button>
      {error && (
        <p className="price-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeletionRequestAction({ account }: { account: Account }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: LifecycleAction, failure: string) {
    setBusy(true);
    setError(null);
    const ok = await callLifecycle(action);
    if (!ok) setError(failure);
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  if (account.deletionRequest) {
    return (
      <div className="lifecycle-action">
        <p className="lifecycle-status" role="status">
          <span className="pill pill-warning">Pending</span> Deletion requested{" "}
          <time dateTime={account.deletionRequest.requestedAt}>
            {longDate(account.deletionRequest.requestedAt)}
          </time>
          . Your portfolio stays readable until the request is processed.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            run(
              { method: "DELETE", path: "/v1/account/deletion-requests" },
              "The deletion request could not be cancelled.",
            )
          }
          type="button"
        >
          Keep my account
        </button>
        {error && (
          <p className="price-warning" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (confirming) {
    return (
      <div
        className="lifecycle-confirm"
        role="group"
        aria-labelledby="deletion-confirm-title"
      >
        <p id="deletion-confirm-title">
          <strong>
            Delete this account and its {account.lotCount}{" "}
            {account.lotCount === 1 ? "lot" : "lots"}?
          </strong>{" "}
          Deletion is processed asynchronously and can be cancelled until then.
        </p>
        <div className="lifecycle-buttons">
          <button
            className="button danger"
            disabled={busy}
            onClick={() =>
              run(
                { method: "POST", path: "/v1/account/deletion-requests" },
                "The deletion request could not be recorded.",
              )
            }
            type="button"
          >
            Request deletion
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirming(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="price-warning" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="lifecycle-action">
      <button
        className="button secondary"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete account…
      </button>
    </div>
  );
}

export function ResetOnboardingAction() {
  const [done, setDone] = useState(false);

  return (
    <div className="lifecycle-action">
      <button
        className="button secondary"
        onClick={() => {
          try {
            localStorage.removeItem(onboardingPreferenceKey);
            delete document.documentElement.dataset
              .portfolioOnboardingDismissed;
          } catch {
            // Storage may be disabled; nothing to reset.
          }
          setDone(true);
        }}
        type="button"
      >
        Show portfolio introduction again
      </button>
      {done && (
        <p className="lifecycle-status" role="status">
          The introduction will appear the next time you open Portfolio.
        </p>
      )}
    </div>
  );
}

export function SignOutAction({ account }: { account: Account }) {
  if (!account.sessionManaged) {
    return (
      <div className="lifecycle-action">
        <button
          aria-describedby="sign-out-note"
          className="button secondary"
          disabled
          type="button"
        >
          Sign out
        </button>
        <p className="subtle" id="sign-out-note">
          The development identity adapter has no session to end. Sign-out
          becomes active once Google or Apple sign-in is enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="lifecycle-action">
      <button className="button secondary" type="button">
        Sign out
      </button>
    </div>
  );
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

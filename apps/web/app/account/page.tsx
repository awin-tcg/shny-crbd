import type { Account } from "@cardboard/contracts";
import type { Metadata } from "next";
import {
  DeletionRequestAction,
  ExportRequestAction,
  ResetOnboardingAction,
  SignOutAction,
} from "../../components/account-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const account = await getAccount();

  return (
    <>
      <section className="portfolio-heading">
        <h1>Account</h1>
      </section>

      {!account ? (
        <div className="notice warning" role="alert">
          The account API is unavailable. Start the API on port 4000 and
          refresh.
        </div>
      ) : (
        <div className="account-sections">
          <section className="panel account-section" aria-labelledby="identity">
            <p className="eyebrow">Identity</p>
            <h2 id="identity">Signed in</h2>
            <dl className="account-facts">
              <div>
                <dt>Collector</dt>
                <dd>{account.userId}</dd>
              </div>
              <div>
                <dt>Identity provider</dt>
                <dd>{issuerLabel(account.issuer)}</dd>
              </div>
              <div>
                <dt>Portfolio</dt>
                <dd>
                  {account.lotCount.toLocaleString("en-US")}{" "}
                  {account.lotCount === 1 ? "lot" : "lots"} · private
                </dd>
              </div>
            </dl>
            <SignOutAction account={account} />
          </section>

          <section className="panel account-section" aria-labelledby="data">
            <p className="eyebrow">Your data</p>
            <h2 id="data">Export and deletion</h2>
            <p className="subtle">
              Requests are recorded immediately and completed asynchronously.
              Card notes, tokens, and provider payloads are never included in
              audit records.
            </p>
            <div className="lifecycle-list">
              <div className="lifecycle-row">
                <div>
                  <h3>Data export</h3>
                  <p className="subtle">
                    A machine-readable copy of your lots and snapshots.
                  </p>
                </div>
                <ExportRequestAction account={account} />
              </div>
              <div className="lifecycle-row">
                <div>
                  <h3>Account deletion</h3>
                  <p className="subtle">
                    Removes your identity, lots, and snapshots after processing.
                  </p>
                </div>
                <DeletionRequestAction account={account} />
              </div>
            </div>
          </section>

          <section
            className="panel account-section"
            aria-labelledby="preferences"
          >
            <p className="eyebrow">Preferences</p>
            <h2 id="preferences">On this device</h2>
            <div className="lifecycle-row">
              <div>
                <h3>Portfolio introduction</h3>
                <p className="subtle">
                  Bring back the first-run banner on the Portfolio page.
                </p>
              </div>
              <ResetOnboardingAction />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function issuerLabel(issuer: string): string {
  if (issuer === "cardboard:mock") return "Development identity (mock)";
  if (issuer.includes("google")) return "Google";
  if (issuer.includes("apple")) return "Apple";
  return issuer;
}

async function getAccount(): Promise<Account | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  try {
    const response = await fetch(`${baseUrl}/v1/account`, {
      cache: "no-store",
      headers: { "x-mock-user-id": "demo-user" },
    });
    if (!response.ok) return null;
    return (await response.json()) as Account;
  } catch {
    return null;
  }
}

"use client";

import { useEffect, useState } from "react";

export const onboardingPreferenceKey =
  "crdbrd.portfolio-onboarding.dismissed.v1";
const preferenceKey = onboardingPreferenceKey;

const preferenceScript = `
try {
  if (localStorage.getItem("${preferenceKey}") === "true") {
    document.documentElement.dataset.portfolioOnboardingDismissed = "true";
  }
} catch {}
`;

export function PortfolioOnboarding() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(preferenceKey) === "true") {
        setVisible(false);
      }
    } catch {
      // Storage can be disabled; the dashboard remains available.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(preferenceKey, "true");
      document.documentElement.dataset.portfolioOnboardingDismissed = "true";
    } catch {
      // Dismiss for this visit even if persistence is unavailable.
    }
    setVisible(false);
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      {visible && (
        <section
          className="onboarding-banner panel"
          aria-labelledby="portfolio-onboarding-title"
        >
          <button
            aria-label="Dismiss portfolio introduction"
            className="onboarding-dismiss"
            onClick={dismiss}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="eyebrow">Private portfolio</p>
          <h2 id="portfolio-onboarding-title">Know what you hold.</h2>
          <p className="lead">
            Exact variant pricing, visible freshness, and no mystery math.
          </p>
        </section>
      )}
    </>
  );
}

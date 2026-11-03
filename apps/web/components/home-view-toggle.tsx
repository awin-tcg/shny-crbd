"use client";

import { useEffect, useState } from "react";

export const homeViewPreferenceKey = "crdbrd.home-view.v1";

type HomeView = "simple" | "advanced";

const preferenceScript = `
try {
  if (localStorage.getItem("${homeViewPreferenceKey}") === "advanced") {
    document.documentElement.dataset.homeView = "advanced";
  }
} catch {}
`;

const views: { value: HomeView; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "advanced", label: "Advanced" },
];

export function HomeViewToggle() {
  const [view, setView] = useState<HomeView>("simple");

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(homeViewPreferenceKey) === "advanced"
          ? "advanced"
          : "simple";
      document.documentElement.dataset.homeView = stored;
      setView(stored);
    } catch {
      // Storage can be disabled; the simple view remains available.
    }
  }, []);

  function choose(next: HomeView) {
    document.documentElement.dataset.homeView = next;
    try {
      localStorage.setItem(homeViewPreferenceKey, next);
    } catch {
      // Switch for this visit even if persistence is unavailable.
    }
    setView(next);
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      <div className="view-toggle" role="group" aria-label="Data view">
        {views.map((option) => (
          <button
            aria-pressed={view === option.value}
            data-view={option.value}
            key={option.value}
            onClick={() => choose(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

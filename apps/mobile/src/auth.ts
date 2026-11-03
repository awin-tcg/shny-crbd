import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "cardboard.session";
const PORTFOLIO_ONBOARDING_KEY = "cardboard.portfolio-onboarding.dismissed.v1";

export interface MobileSession {
  accessToken?: string;
  mockUserId?: string;
}

export interface MobileIdentity {
  restore(): Promise<MobileSession | null>;
  signIn(): Promise<MobileSession>;
  signOut(): Promise<void>;
}

export class MockMobileIdentity implements MobileIdentity {
  async restore(): Promise<MobileSession | null> {
    const serialized = await SecureStore.getItemAsync(SESSION_KEY);
    return serialized ? (JSON.parse(serialized) as MobileSession) : null;
  }

  async signIn(): Promise<MobileSession> {
    const session = { mockUserId: "demo-user" };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return session;
  }

  async signOut(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export function createMobileIdentity(): MobileIdentity {
  const mode = process.env.EXPO_PUBLIC_AUTH_MODE ?? "mock";
  if (mode !== "mock") {
    throw new Error(
      "Production OIDC is gated until the identity-provider ADR is resolved",
    );
  }
  return new MockMobileIdentity();
}

export async function isPortfolioOnboardingDismissed(): Promise<boolean> {
  try {
    return (
      (await SecureStore.getItemAsync(PORTFOLIO_ONBOARDING_KEY)) === "true"
    );
  } catch {
    return false;
  }
}

export async function dismissPortfolioOnboarding(): Promise<void> {
  try {
    await SecureStore.setItemAsync(PORTFOLIO_ONBOARDING_KEY, "true", {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {
    // Dismissal still applies for the current session in the caller.
  }
}

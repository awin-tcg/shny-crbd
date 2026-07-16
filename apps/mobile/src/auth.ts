import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "cardboard.session";

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

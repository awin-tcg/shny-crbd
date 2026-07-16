// Expo inlines EXPO_PUBLIC_* variables at build time; declare only what we read.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_AUTH_MODE?: string;
  };
};

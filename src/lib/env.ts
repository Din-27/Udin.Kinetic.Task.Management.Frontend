/**
 * Application Environment Helper
 */

export const isProduction =
  process.env.NEXT_PUBLIC_APP_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.NODE_ENV === "production";

export const isDevelopment = !isProduction;

export const isDevBypassAllowed = isDevelopment;

export const isEmailSyncEnabled =
  process.env.NEXT_PUBLIC_ENABLE_EMAIL_SYNC !== "false" &&
  process.env.ENABLE_EMAIL_SYNC !== "false";

export const hasGoogleConfig = Boolean(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_HAS_GOOGLE === "true"
);

export const hasAzureAdConfig = Boolean(
  process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ||
  process.env.AZURE_AD_CLIENT_ID ||
  process.env.NEXT_PUBLIC_HAS_AZURE_AD === "true"
);

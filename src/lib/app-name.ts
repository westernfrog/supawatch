const configuredAppName = process.env.NEXT_PUBLIC_APP_NAME?.trim();

export const APP_NAME = configuredAppName || "Supawatch";
export const APP_NAME_UPPERCASE = APP_NAME.toUpperCase();

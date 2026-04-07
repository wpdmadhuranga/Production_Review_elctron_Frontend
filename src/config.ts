/**
 * Centralised runtime configuration.
 * Values are injected at build time by webpack DefinePlugin (from .env).
 */

declare const process: { env: { API_BASE_URL?: string } };

export const API_BASE_URL: string =
  (typeof process !== "undefined" && process.env.API_BASE_URL) ||
  "";

import { API_BASE_URL } from "../../config";

// Simple authentication service for interacting with /api/v1/login

export interface UserDto {
  id: number;
  userName: string;
  isActive: boolean;
  // additional fields are possible
  [key: string]: any;
}

export interface AdminDto {
  id: number;
  userName: string;
  isActive: boolean;
  [key: string]: any;
}

export interface LoginResponse {
  token: string;
  user: UserDto | AdminDto;
}

const STORAGE_KEY = "auth_token";

// backend base URL — read from environment (.env → config.ts)
const BASE_URL = API_BASE_URL;

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuthHeader(): { Authorization?: string } {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Perform login against the backend. On success the token is persisted
 * and the parsed response is returned.
 */
export async function login(userName: string, password: string): Promise<LoginResponse> {
  const resp = await fetch(`${BASE_URL}/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password }),
  });

  if (resp.ok) {
    const body = (await resp.json()) as LoginResponse;
    setToken(body.token);
    return body;
  }

  if (resp.status === 401) {
    // invalid credentials or inactive account
    throw new Error("Invalid username/password or inactive account");
  }

  throw new Error("Unexpected server error");
}

/**
 * Convenience wrapper around fetch that attaches the auth header.
 */
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const headers = { ...(init?.headers as any), ...getAuthHeader() };
  return fetch(input, { ...init, headers });
}

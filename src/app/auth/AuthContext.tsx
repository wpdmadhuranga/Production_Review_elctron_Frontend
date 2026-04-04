import { createContext, ReactNode, useCallback, useState } from "react";
import { getToken, logout, setToken } from "../services/authService";
import type { AuthContextValue } from "./types";

export const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractIsAdmin(token?: string | null): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const roleValue =
    payload.role ||
    payload.roles ||
    payload.userType ||
    payload.type ||
    payload.isAdmin ||
    payload.admin;

  if (Array.isArray(roleValue)) {
    return roleValue.some((role) => String(role).toLowerCase().includes("admin"));
  }

  const normalized = String(roleValue || "").toLowerCase();
  return ["admin", "administrator", "superadmin"].some((key) => normalized.includes(key));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken);
  const [isAdmin, setIsAdminState] = useState<boolean>(() => extractIsAdmin(getToken()));

  const signIn = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    setIsAdminState(extractIsAdmin(newToken));
  }, []);

  const signOut = useCallback(() => {
    logout();
    setTokenState(null);
    setIsAdminState(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: !!token, isAdmin, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

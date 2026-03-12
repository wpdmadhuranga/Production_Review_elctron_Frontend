import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

/**
 * Wraps any route that requires authentication.
 * If no JWT is present in localStorage the user is redirected to /login.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

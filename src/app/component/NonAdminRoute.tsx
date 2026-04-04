import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function NonAdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

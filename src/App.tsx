import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./app/component/ProtectedRoute";
import { MainLayout } from "./app/layouts/MainLayout";
import Dashboard from "./app/pages/dashboard";
import Grading from "./app/pages/Grading";
import LoginPage from "./app/pages/LoginPage";
import DefectWise from "./app/pages/reports/DefectWise";
import ItemWise from "./app/pages/reports/ItemWise";
import ShiftWise from "./app/pages/reports/ShiftWise";
import Summery from "./app/pages/reports/Summery";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* root should go to login by default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* protected area — requires valid JWT in localStorage */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/grading" element={<Grading />} />
            <Route path="/production-reports/summary" element={<Summery />} />
            <Route path="/production-reports/item-wise" element={<ItemWise />} />
            <Route path="/production-reports/defect-wise" element={<DefectWise />} />
            <Route path="/production-reports/shift-wise" element={<ShiftWise />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}

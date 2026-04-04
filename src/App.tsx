import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import LicenseActivation from "./app/component/LicenseActivation";
import { NonAdminRoute } from "./app/component/NonAdminRoute";
import { ProtectedRoute } from "./app/component/ProtectedRoute";
import { MainLayout } from "./app/layouts/MainLayout";
import Dashboard from "./app/pages/dashboard";
import Grading from "./app/pages/Grading";
import LoginPage from "./app/pages/LoginPage";
import DefectWise from "./app/pages/reports/DefectWise";
import ItemWise from "./app/pages/reports/ItemWise";
import ShiftWise from "./app/pages/reports/ShiftWise";
import Summery from "./app/pages/reports/Summery";
import { getStoredLicense, isAllowedOfflineGrace, validate } from "./app/services/licenseService";

export default function App() {
  const [ready, setReady] = useState(false);
  const [licensed, setLicensed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startupValidation = async () => {
      try {
        const stored = await getStoredLicense();
        const machineId = await window.electronAPI.getMachineId();

        if (!stored || !machineId) {
          if (mounted) setLicensed(false);
          return;
        }

        try {
          const res = await validate(stored, machineId);
          if (mounted) {
            setLicensed(res.valid);
          }
        } catch {
          const graceOk = await isAllowedOfflineGrace(7);
          if (mounted) {
            setLicensed(graceOk);
          }
        }
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    startupValidation();

    const interval = setInterval(async () => {
      try {
        const stored = await getStoredLicense();
        if (!stored) return;
        const machineId = await window.electronAPI.getMachineId();
        await validate(stored, machineId);
      } catch {
        // Network failures are handled by offline grace on next startup.
      }
    }, 24 * 60 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!licensed) {
    return <LicenseActivation onActivated={() => setLicensed(true)} />;
  }

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
            <Route element={<NonAdminRoute />}>
              <Route path="/grading" element={<Grading />} />
            </Route>
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

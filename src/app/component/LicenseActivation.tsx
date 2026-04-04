import { useState } from "react";
import { activate, getSupportInfo } from "../services/licenseService";

interface LicenseActivationProps {
	onActivated?: () => void;
}

export default function LicenseActivation({ onActivated }: LicenseActivationProps) {
	const [licenseKey, setLicenseKey] = useState("");
	const [userName, setUserName] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const handleActivate = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setMessage(null);

		try {
			const machineId = await window.electronAPI.getMachineId();
			const res = await activate(licenseKey.trim(), machineId, userName.trim() || undefined);
			if (res.valid) {
				setMessage("Activated successfully");
				onActivated?.();
			} else {
				setMessage(res.message || "Activation failed");
			}
		} catch (err) {
			setMessage(err instanceof Error ? err.message : "Activation failed");
		} finally {
			setLoading(false);
		}
	};

	const copySupportInfo = async () => {
		try {
			const info = await getSupportInfo();
			const payload = `machineId: ${info.machineId}\nlicenseKey: ${info.licenseKey}\nlastValidatedAt: ${info.lastValidatedAt || "(none)"}\nexpiresAt: ${info.expiresAt || "(none)"}`;
			await navigator.clipboard.writeText(payload);
			setMessage("Support info copied to clipboard");
		} catch {
			setMessage("Failed to copy support info");
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
			<div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
				<h2 className="text-2xl font-bold text-slate-900">License Activation Required</h2>
				<p className="mt-2 text-sm text-slate-600">
					Enter your license key to unlock the application.
				</p>

				<form onSubmit={handleActivate} className="mt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">License key</label>
						<input
							value={licenseKey}
							onChange={(e) => setLicenseKey(e.target.value)}
							placeholder="LAUGFS-XXXX-XXXX"
							required
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">User name (optional)</label>
						<input
							value={userName}
							onChange={(e) => setUserName(e.target.value)}
							placeholder="Your name"
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div className="flex items-center gap-3 pt-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
						>
							{loading ? "Activating..." : "Activate"}
						</button>
						<button
							type="button"
							onClick={copySupportInfo}
							className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
						>
							Copy support info
						</button>
					</div>

					{message && <p className="text-sm text-rose-600">{message}</p>}
				</form>
			</div>
		</div>
	);
}

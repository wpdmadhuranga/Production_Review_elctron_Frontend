import licenseClient, { LicenseApiResult } from "./licenseClient";

const CACHE_KEYS = {
	lastValidated: "license.lastValidatedAt",
	expiresAt: "license.expiresAt",
};

export async function storeLicenseSecure(licenseKey: string, expiresAt?: string | null) {
	await window.electronAPI.storeLicense(licenseKey);
	await window.electronAPI.setCache(CACHE_KEYS.lastValidated, Date.now());
	if (expiresAt) {
		await window.electronAPI.setCache(CACHE_KEYS.expiresAt, expiresAt);
	}
}

export async function getStoredLicense(): Promise<string | null> {
	return window.electronAPI.getStoredLicense();
}

export async function clearStoredLicense() {
	return window.electronAPI.clearStoredLicense();
}

export async function activate(licenseKey: string, machineId: string, userName?: string): Promise<LicenseApiResult> {
	const res = await licenseClient.activate(licenseKey, machineId, userName);
	if (res.valid) {
		await storeLicenseSecure(licenseKey, res.expiresAt);
	}
	return res;
}

export async function validate(
	licenseKey: string,
	machineId: string,
	options: { refreshCache?: boolean } = {}
): Promise<LicenseApiResult> {
	const { refreshCache = true } = options;
	const res = await licenseClient.validate(licenseKey, machineId);
	if (res.valid && refreshCache) {
		await window.electronAPI.setCache(CACHE_KEYS.lastValidated, Date.now());
		if (res.expiresAt) {
			await window.electronAPI.setCache(CACHE_KEYS.expiresAt, res.expiresAt);
		}
	}
	return res;
}

export async function isAllowedOfflineGrace(graceDays = 7): Promise<boolean> {
	const last = await window.electronAPI.getCache(CACHE_KEYS.lastValidated);
	const exp = await window.electronAPI.getCache(CACHE_KEYS.expiresAt);
	const now = Date.now();

	if (exp && new Date(String(exp)).getTime() > now) {
		return true;
	}

	if (last && now - Number(last) <= graceDays * 24 * 60 * 60 * 1000) {
		return true;
	}

	return false;
}

export async function getSupportInfo() {
	const machineId = await window.electronAPI.getMachineId();
	const stored = await getStoredLicense();
	const lastValidatedAt = await window.electronAPI.getCache(CACHE_KEYS.lastValidated);
	const expiresAt = await window.electronAPI.getCache(CACHE_KEYS.expiresAt);
	const maskedLicenseKey = stored
		? `${stored.slice(0, 6)}...${stored.slice(-4)}`
		: "(none)";

	return {
		machineId,
		licenseKey: maskedLicenseKey,
		lastValidatedAt,
		expiresAt,
	};
}

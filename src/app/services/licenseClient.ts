export interface LicenseApiResult {
  valid: boolean;
  expiresAt: string | null;
  activationsCount: number | null;
  message: string | null;
  raw: any;
}

async function getConfig() {
  try {
    return await window.electronAPI.getConfig();
  } catch {
    return { API_BASE_URL: "http://localhost:5000" };
  }
}

async function request(path: string, options: { method?: string; body?: any } = {}): Promise<LicenseApiResult> {
  const cfg = await getConfig();
  const url = cfg.API_BASE_URL.replace(/\/$/, "") + path;
  const res = await fetch(url, {
    method: options.method || (options.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    const errMsg = (json && (json.message || json.Message)) || res.statusText;
    throw new Error(errMsg);
  }

  return {
    valid: json.valid ?? json.Valid ?? false,
    expiresAt: json.expiresAt ?? json.ExpiresAt ?? null,
    activationsCount: json.activationsCount ?? json.ActivationsCount ?? null,
    message: json.message ?? json.Message ?? null,
    raw: json,
  };
}

const licenseClient = {
  activate(licenseKey: string, machineId: string, userName?: string) {
    return request("/api/v1/license/activate", { body: { licenseKey, machineId, userName } });
  },
  validate(licenseKey: string, machineId: string) {
    return request("/api/v1/license/validate", { body: { licenseKey, machineId } });
  },
  revoke(licenseKey: string) {
    return request("/api/v1/license/revoke", { body: { licenseKey } });
  },
  async status(licenseKey: string) {
    const cfg = await getConfig();
    const base = cfg.API_BASE_URL.replace(/\/$/, "");
    const url = `${base}/api/v1/license/status?licenseKey=${encodeURIComponent(licenseKey)}`;
    const res = await fetch(url);
    return res.json();
  },
};

export default licenseClient;
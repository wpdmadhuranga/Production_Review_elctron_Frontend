import { API_BASE_URL } from "../../config";
import { authFetch, getApiBaseUrl, getToken } from "./authService";

export interface ProductionRecordProductEntry {
  tyreTypeId: number;
  totalProduction: number;
}

export interface ProductionRecordTyreItemEntry {
  serialNumber: string;
  operatorNumber: number;
  userId: number;
  createdBy: string | number;
  defect: string;
  cOrD: "C" | "D" | string;
  tyreTypeId: number;
  moldNumberId: number;
  totalProduction: number;
}

export interface ProductionRecordBatchEntry {
  lineNumberId: number;
  shift: string;
  productionDate: string;
  createdBy: string | number;
  plannedTotalTyres: number;
  actualTotalTyres: number;
  productEntries: ProductionRecordProductEntry[];
  tyreItems: ProductionRecordTyreItemEntry[];
}

const BASE = `${API_BASE_URL}/api/v1`;
const MONTHLY_SUMMARY_STORAGE_KEY = "production.monthlySummary.v1";
const MONTHLY_SUMMARY_SOCKET_PATH = "/api/v1/production-report/monthly-summary/ws";
const SOCKET_TIMEOUT_MS = 8000;
const SOCKET_RETRY_BACKOFF_MS = 60 * 1000;

let socketRetryAfter = 0;

function readMonthlySummaryCache() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(MONTHLY_SUMMARY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.data || parsed;
      }
    }
  } catch {
    // ignore cache read errors
  }
  return null;
}

function writeMonthlySummaryCache(data: any) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        MONTHLY_SUMMARY_STORAGE_KEY,
        JSON.stringify({ data, fetchedAt: new Date().toISOString() })
      );
    }
  } catch {
    // ignore cache set errors
  }
}

function buildSocketUrl(origin: string, token: string | null): string {
  const url = new URL(`${origin}${MONTHLY_SUMMARY_SOCKET_PATH}`);
  if (token) {
    url.searchParams.set("access_token", token);
  }
  return url.toString();
}

async function resolveMonthlySummarySocketUrls() {
  const token = getToken();
  const urls: string[] = [];
  const resolvedBaseUrl = (await getApiBaseUrl()) || API_BASE_URL;

  try {
    const apiUrl = new URL(resolvedBaseUrl);
    const isLocalHost = apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";

    if (isLocalHost) {
      // Avoid noisy SSL handshake failures on self-signed local certs.
      urls.push(buildSocketUrl(`ws://${apiUrl.host}`, token));
    } else {
      const primaryProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
      urls.push(buildSocketUrl(`${primaryProtocol}//${apiUrl.host}`, token));

      const alternateProtocol = primaryProtocol === "wss:" ? "ws:" : "wss:";
      urls.push(buildSocketUrl(`${alternateProtocol}//${apiUrl.host}`, token));
    }
  } catch {
    // Ignore invalid API base URL and fall back to local dev socket below.
  }

  urls.push(buildSocketUrl("ws://localhost:5035", token));

  return Array.from(new Set(urls));
}

function isMonthlySummaryPayload(payload: any) {
  return !!payload && (payload.currentMonth || payload.previousMonth);
}

async function getProductionMonthlySummaryViaSocket(): Promise<any> {
  if (typeof window === "undefined" || typeof window.WebSocket === "undefined") {
    throw new Error("WebSocket is not available in this environment");
  }

  const socketUrls = await resolveMonthlySummarySocketUrls();

  const connectAndFetch = (socketUrl: string) =>
    new Promise<any>((resolve, reject) => {
      let handshakeDone = false;
      let settled = false;
      const maskedSocketUrl = socketUrl.replace(/(access_token=)[^&]+/, "$1***");
      console.log(`[WS Handshake] 1. Initiating connection to: ${maskedSocketUrl}`);
      const ws = new WebSocket(socketUrl);

      const timeout = setTimeout(() => {
        console.warn("[WS Handshake] x. Connection timed out.");
        ws.close();
        reject(new Error("WebSocket monthly summary timeout"));
      }, SOCKET_TIMEOUT_MS);

      const finalize = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        try {
          callback();
        } finally {
          ws.close();
        }
      };

      ws.onopen = () => {
        console.log("[WS Handshake] 2. Connection open. Sending handshake payload...");
        ws.send(
          JSON.stringify({
            type: "handshake",
            client: "desktop-app",
            timestamp: new Date().toISOString(),
          })
        );
      };

      ws.onerror = () => {
        console.error("[WS Handshake] x. Connection error occurred.");
        finalize(() => reject(new Error("WebSocket monthly summary connection failed")));
      };

      ws.onclose = (event) => {
        if (settled) {
          return;
        }

        console.error(
          `[WS Handshake] x. Socket closed before success. code=${event.code} reason=${event.reason || "(none)"} clean=${event.wasClean}`
        );
        finalize(() => reject(new Error(`WebSocket closed: code=${event.code}`)));
      };

      ws.onmessage = (event) => {
        let message: any = null;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (!handshakeDone) {
          const isAck =
            message?.type === "handshake-ack" ||
            message?.event === "handshake-ack" ||
            message?.ack === true;

          if (isAck) {
            console.log("[WS Handshake] 3. Handshake ACK received! Requesting monthly summary...");
            handshakeDone = true;
            ws.send(JSON.stringify({ type: "get-monthly-summary" }));
            return;
          } else {
            console.warn("[WS Handshake] Received unexpected message during handshake:", message);
          }
        }

        const payload = isMonthlySummaryPayload(message) ? message : message?.data;
        if (isMonthlySummaryPayload(payload)) {
          console.log("[WS Handshake] 4. Success! Monthly summary payload received via socket.");
          finalize(() => resolve(payload));
          return;
        }

        if (message?.type === "error" || message?.error) {
          console.error("[WS Handshake] x. Error returned by server:", message);
          const msg = message?.message || message?.error || "Socket monthly summary request failed";
          finalize(() => reject(new Error(String(msg))));
        }
      };
    });

  let lastError: unknown = null;

  for (let i = 0; i < socketUrls.length; i += 1) {
    const socketUrl = socketUrls[i];
    try {
      return await connectAndFetch(socketUrl);
    } catch (err) {
      lastError = err;
      const maskedSocketUrl = socketUrl.replace(/(access_token=)[^&]+/, "$1***");
      console.warn(`[WS Handshake] Attempt ${i + 1}/${socketUrls.length} failed for ${maskedSocketUrl}`);
    }
  }

  throw lastError || new Error("WebSocket monthly summary connection failed");
}

export async function batchCreateProductionRecords(
  payload: ProductionRecordBatchEntry[]
): Promise<any> {
  const res = await authFetch(`${BASE}/production-record/batch-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch create failed: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

export async function getProductionReportFilter(options: {
  dateFrom?: string | Date | null;
  dateTo?: string | Date | null;
  tyreTypeId?: number | null;
  defect?: string | null;
  shift?: string | null;
  line?: string | null;
}): Promise<any> {
  const { dateFrom, dateTo, tyreTypeId, defect, shift, line } = options || {};

  const params = new URLSearchParams();
  if (dateFrom) params.append("dateFrom", typeof dateFrom === "string" ? dateFrom : dateFrom.toISOString());
  if (dateTo) params.append("dateTo", typeof dateTo === "string" ? dateTo : dateTo.toISOString());
  if (tyreTypeId != null) params.append("tyreTypeId", String(tyreTypeId));
  if (defect) params.append("defect", defect);
  if (shift) params.append("shift", shift);
  if (line) params.append("line", line);

  const url = `${BASE}/production-report/filter${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await authFetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Production report filter failed: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

export async function getProductionMonthlySummary(forceRefresh = false): Promise<any> {
  // Prefer socket handshake path first, then fall back to HTTP.
  const canTrySocket = Date.now() >= socketRetryAfter;

  if (canTrySocket) {
    try {
      const socketJson = await getProductionMonthlySummaryViaSocket();
      socketRetryAfter = 0;
      writeMonthlySummaryCache(socketJson);
      return socketJson;
    } catch (err) {
      socketRetryAfter = Date.now() + SOCKET_RETRY_BACKOFF_MS;
      console.warn("[WS Handshake] x. Handshake path failed, falling back to HTTP...", err);
      console.warn(
        `[WS Handshake] Next socket retry after ${new Date(socketRetryAfter).toISOString()} (backoff ${SOCKET_RETRY_BACKOFF_MS}ms)`
      );
      // fall through to HTTP fallback
    }
  } else {
    const waitMs = socketRetryAfter - Date.now();
    console.log(`[WS Handshake] Skipping socket attempt (backoff active ${waitMs}ms remaining)`);
  }

  const url = `${BASE}/production-report/monthly-summary`;

  const res = await authFetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Production monthly summary failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const json = await res.json();

  writeMonthlySummaryCache(json);

  return json;
}

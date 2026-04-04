export { };

declare global {
  interface Window {
    electronAPI: {
      getMachineId: () => Promise<string>;
      storeLicense: (licenseKey: string) => Promise<boolean>;
      getStoredLicense: () => Promise<string | null>;
      clearStoredLicense: () => Promise<boolean>;
      getConfig: () => Promise<{ API_BASE_URL: string }>;
      setCache: (key: string, value: unknown) => Promise<boolean>;
      getCache: (key: string) => Promise<unknown>;
    };
  }
}

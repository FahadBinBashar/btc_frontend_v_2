type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  responseType?: "json" | "text";
};

const RAW_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8000";
const API_BASE_URL =
  import.meta.env.DEV && /^https?:\/\//i.test(RAW_API_BASE_URL) ? "" : RAW_API_BASE_URL;
const ADMIN_TOKEN_KEY = "btc_admin_token";
const ADMIN_EMAIL_KEY = "btc_admin_email";

export const authStorage = {
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY),
  getEmail: () => localStorage.getItem(ADMIN_EMAIL_KEY),
  setEmail: (email: string) => localStorage.setItem(ADMIN_EMAIL_KEY, email),
  clearEmail: () => localStorage.removeItem(ADMIN_EMAIL_KEY),
  clear: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
  },
};

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!API_BASE_URL) return path.startsWith("/") ? path : `/${path}`;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};

const apiRequest = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { method = "GET", body, headers, auth = false, responseType = "json" } = options;
  const requestHeaders: Record<string, string> = {
    ...(headers || {}),
  };

  if (body !== undefined && method !== "GET") {
    requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/json";
  }

  if (auth) {
    const token = authStorage.getToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: body !== undefined && method !== "GET" ? JSON.stringify(body) : undefined,
  });

  const payload = responseType === "text" ? await response.text() : await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || response.statusText || "Request failed";
    throw new Error(message);
  }

  return payload as T;
};

export const api = {
  adminLogin: (email: string, password: string) =>
    apiRequest<{ token?: string; access_token?: string; user?: { email?: string; name?: string } }>(
      "/api/admin/login",
      { method: "POST", body: { email, password } }
    ),
  adminDashboard: () => apiRequest("/api/admin/dashboard", { auth: true }),
  adminUsers: () => apiRequest("/api/admin/users", { auth: true }),
  adminCreateUser: (payload: { name?: string; email: string; password: string }) =>
    apiRequest("/api/admin/users", { method: "POST", body: payload, auth: true }),
  adminCreateAdmin: (payload: { fullName?: string; email: string; password: string }) =>
    apiRequest("/api/admin/users/create-admin", { method: "POST", body: payload, auth: true }),
  adminAssignRole: (payload: { userId: string; role: string }) =>
    apiRequest("/api/admin/users/assign-role", { method: "POST", body: payload, auth: true }),
  adminRemoveRole: (payload: { userId: string; role: string }) =>
    apiRequest("/api/admin/users/remove-role", { method: "POST", body: payload, auth: true }),
  adminMakeAdmin: (userId: string) =>
    apiRequest(`/api/admin/users/${userId}/make-admin`, { method: "PATCH", body: {}, auth: true }),
  adminRemoveAdmin: (userId: string) =>
    apiRequest(`/api/admin/users/${userId}/remove-admin`, { method: "PATCH", body: {}, auth: true }),
  adminPayments: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return apiRequest(`/api/admin/payments${query}`, { auth: true });
  },
  subscriberLookup: (msisdn: string) =>
    apiRequest("/api/subscriber-lookup", { method: "POST", body: { msisdn } }),
  otpSend: (msisdn: string) =>
    apiRequest("/api/otp/send", { method: "POST", body: { msisdn } }),
  otpVerify: (msisdn: string, otp: string) =>
    apiRequest("/api/otp/verify", { method: "POST", body: { msisdn, otp } }),
  paymentsRecord: (payload: { msisdn?: string | null; amount: number; currency: string; status: string }) =>
    apiRequest("/api/payments/record", { method: "POST", body: payload }),
  subscriberUpload: (phoneNumbers: string[]) =>
    apiRequest("/api/subscriber-upload", { method: "POST", body: { phoneNumbers } }),
  esimStart: () => apiRequest<{ request_id?: string | number }>("/api/esim/start", { method: "POST", body: {} }),
  esimAcceptTerms: (requestId: string | number, accepted: boolean) =>
    apiRequest(`/api/esim/${requestId}/terms`, { method: "POST", body: { accepted } }),
  esimPayment: (requestId: string | number, amount: number) =>
    apiRequest(`/api/esim/${requestId}/payment`, { method: "POST", body: { amount } }),
  esimNumbers: (requestId: string | number) => apiRequest(`/api/esim/${requestId}/numbers`),
  esimSelectNumber: (requestId: string | number, msisdn: string) =>
    apiRequest(`/api/esim/${requestId}/number`, { method: "POST", body: { msisdn } }),
  esimRegistration: (requestId: string | number, payload: Record<string, unknown>) =>
    apiRequest(`/api/esim/${requestId}/registration`, { method: "POST", body: payload }),
  esimStartKyc: (requestId: string | number, document_type: string) =>
    apiRequest(`/api/esim/${requestId}/kyc/start`, { method: "POST", body: { document_type } }),
  esimKycStatus: (requestId: string | number) => apiRequest(`/api/esim/${requestId}/kyc/status`),
  esimConfirmKyc: (requestId: string | number, verified: boolean) =>
    apiRequest(`/api/esim/${requestId}/confirm-kyc`, { method: "POST", body: { verified } }),
  esimActivate: (requestId: string | number) =>
    apiRequest(`/api/esim/${requestId}/activate`, { method: "POST", body: {} }),
  simswapStart: () => apiRequest<{ request_id?: string | number }>("/api/simswap/start", { method: "POST", body: {} }),
  simswapNumber: (requestId: string | number, msisdn: string) =>
    apiRequest(`/api/simswap/${requestId}/number`, { method: "POST", body: { msisdn } }),
  simswapOtpSend: (requestId: string | number, channel: string) =>
    apiRequest(`/api/simswap/${requestId}/otp/send`, { method: "POST", body: { channel } }),
  simswapOtpVerify: (requestId: string | number, otp: string) =>
    apiRequest(`/api/simswap/${requestId}/otp/verify`, { method: "POST", body: { otp } }),
  simswapPayment: (requestId: string | number, amount: number) =>
    apiRequest(`/api/simswap/${requestId}/payment`, { method: "POST", body: { amount } }),
  simswapStartKyc: (requestId: string | number, document_type: string) =>
    apiRequest(`/api/simswap/${requestId}/kyc/start`, { method: "POST", body: { document_type } }),
  simswapKycStatus: (requestId: string | number) => apiRequest(`/api/simswap/${requestId}/kyc/status`),
  simswapSimType: (requestId: string | number, sim_type: string) =>
    apiRequest(`/api/simswap/${requestId}/sim-type`, { method: "POST", body: { sim_type } }),
  simswapFinalizeEsim: (requestId: string | number) =>
    apiRequest(`/api/simswap/${requestId}/esim/finalize`, { method: "POST", body: {} }),
  simswapSelectShop: (requestId: string | number, shop_id: number) =>
    apiRequest(`/api/simswap/${requestId}/shop/select`, { method: "POST", body: { shop_id } }),
  kycComplianceStart: () =>
    apiRequest<{ request_id?: string | number }>("/api/kyc-compliance/start", { method: "POST", body: {} }),
  kycComplianceTerms: (requestId: string | number, accepted: boolean) =>
    apiRequest(`/api/kyc-compliance/${requestId}/terms`, { method: "POST", body: { accepted } }),
  kycComplianceNumber: (requestId: string | number, msisdn: string) =>
    apiRequest(`/api/kyc-compliance/${requestId}/number`, { method: "POST", body: { msisdn } }),
  kycComplianceRegistration: (requestId: string | number, payload: Record<string, unknown>) =>
    apiRequest(`/api/kyc-compliance/${requestId}/registration`, { method: "POST", body: payload }),
  kycComplianceStartKyc: (
    requestId: string | number,
    payload: { document_type: string; session_id?: string; verification_id?: string; identity_id?: string }
  ) => apiRequest(`/api/kyc-compliance/${requestId}/kyc/start`, { method: "POST", body: payload }),
  kycComplianceStatus: (requestId: string | number) => apiRequest(`/api/kyc-compliance/${requestId}/status`),
  kycComplianceComplete: (requestId: string | number, payload: { verified: boolean; kyc_verification_id?: number }) =>
    apiRequest(`/api/kyc-compliance/${requestId}/complete`, { method: "POST", body: payload }),
  smegaStart: () => apiRequest<{ request_id?: string | number }>("/api/smega/start", { method: "POST", body: {} }),
  smegaMsisdn: (requestId: string | number, msisdn: string) =>
    apiRequest(`/api/smega/${requestId}/msisdn`, { method: "POST", body: { msisdn } }),
  smegaInlineKycComplete: (requestId: string | number, payload: Record<string, unknown>) =>
    apiRequest(`/api/smega/${requestId}/inline-kyc/complete`, { method: "POST", body: payload }),
  smegaOtpSend: (requestId: string | number) =>
    apiRequest(`/api/smega/${requestId}/otp/send`, { method: "POST", body: {} }),
  smegaOtpVerify: (requestId: string | number, payload: { challenge_id: number | string; code: string }) =>
    apiRequest(`/api/smega/${requestId}/otp/verify`, { method: "POST", body: payload }),
  smegaComplete: (requestId: string | number, correlationId?: string) =>
    apiRequest(`/api/smega/${requestId}/complete`, {
      method: "POST",
      body: {},
      headers: correlationId ? { "x-correlation-id": correlationId } : undefined,
    }),
};

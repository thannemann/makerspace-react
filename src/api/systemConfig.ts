import axios from "axios";

const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const api = axios.create({ withCredentials: true });
api.interceptors.request.use(config => {
  config.headers["X-XSRF-TOKEN"] = getCsrfToken();
  config.headers["Content-Type"] = "application/json";
  return config;
});

const wrapHeaders = (axiosHeaders: Record<string, any>) => ({
  get: (key: string) => axiosHeaders[key.toLowerCase()] ?? null,
  has: (key: string) => key.toLowerCase() in axiosHeaders,
});

const buildResponse = async <T>(request: Promise<any>) => {
  try {
    const res = await request;
    return { data: res.data, response: { ...res, headers: wrapHeaders(res.headers) } };
  } catch (err) {
    const error = err.response?.data?.error || { message: err.message };
    return { error, response: err.response };
  }
};

export interface JobStatus {
  key: string;
  task: string;
  last_run_at: string | null;
  last_run_status: "success" | "failure" | null;
}

export interface SystemConfigData {
  flags: {
    slack_sync_enabled: boolean;
  };
  jobs: JobStatus[];
}

export const getSystemConfigs = () =>
  buildResponse<SystemConfigData>(api.get("/api/admin/system_configs"));

export const updateSystemFlag = ({ key, value }: { key: string; value: boolean }) =>
  buildResponse<{ key: string; value: string }>(
    api.put("/api/admin/system_configs/update_flag", { key, value: value.toString() })
  );

export const runSystemJob = ({ key }: { key: string }) =>
  buildResponse<{ message: string }>(
    api.post("/api/admin/system_configs/run_job", { key })
  );

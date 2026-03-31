import { AxiosResponse } from 'axios';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const payload = response.data as ApiEnvelope<T> | T;
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return ((payload as ApiEnvelope<T>).data as T) ?? ({} as T);
  }
  return payload as T;
}

export function unwrapPagination(response: AxiosResponse<any>) {
  const payload = response.data as ApiEnvelope<unknown>;
  return payload?.pagination ?? null;
}


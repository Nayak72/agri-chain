export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  sort?: string;
  q?: string;
  [filter: string]: string | number | boolean | undefined;
}

export type ListPayload<T> = T[] | Page<T>;

export function asPage<T>(payload: ListPayload<T>, params: ListParams = {}): Page<T> {
  if (!Array.isArray(payload)) return payload;
  const page = params.page ?? 1;
  const pageSize = (params.page_size ?? payload.length) || 20;
  return { items: payload, total: payload.length, page, page_size: pageSize, has_next: false };
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: Record<string, unknown>;
  field_errors: FieldError[];
  request_id?: string;
}

export type ApiResponse<T> = { data: T; message?: string };
export type ApiError = { message: string; issues?: unknown };
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

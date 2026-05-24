export interface ResponseEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

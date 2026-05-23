export interface ResponseEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
}

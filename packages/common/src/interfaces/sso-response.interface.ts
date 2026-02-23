export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: Date;
  correlationId?: string;
}

export interface IErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: Date;
  correlationId?: string;
}

import { UserInterface } from './user.interface';

export interface IAuthorizationCodeResponse {
  authCode: string;
  expiresAt: Date;
  expiresIn: number;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: Date;
  correlationId?: string;
}

export interface IGenerateCodeResponse extends IApiResponse<IAuthorizationCodeResponse> {}

export interface IValidateCodeResponse extends IApiResponse<UserInterface> {}

export interface IErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: Date;
  correlationId?: string;
}
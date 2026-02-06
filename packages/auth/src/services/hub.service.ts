import { BadGatewayException, BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { IValidateCodeResponse } from '@loopstack/common';
import { SsoValidateCodeInterface } from '@loopstack/common';
import {
  HubAuthenticationException,
  HubConfigurationException,
  HubServiceUnavailableException,
  HubTimeoutException,
  InvalidAuthCodeException,
} from '../exceptions/hub.exceptions';
import { HubConfig, RequestContext } from '../interfaces/hub-service.interfaces';
import { HubAuditService } from './hub-audit.service';

@Injectable()
export class HubService implements OnModuleInit {
  private readonly logger = new Logger(HubService.name);
  private axiosInstance: AxiosInstance;
  private config: HubConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: HubAuditService,
  ) {}

  onModuleInit(): void {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.config = this.getConfig();

      if (!this.configService.get<boolean>('app.isLocalMode')) {
        this.validateConfiguration();
      }

      this.axiosInstance = axios.create({
        timeout: this.config.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HubService/1.0',
        },
      });

      this.setupAxiosInterceptors();

      this.logger.log('Hub service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Hub service:', error);
      throw new HubConfigurationException('Service initialization failed');
    }
  }

  private getConfig(): HubConfig {
    return {
      authCallback: this.configService.get<string>('auth.authCallback') ?? '',
      clientId: this.configService.get<string>('auth.clientId') ?? '',
      clientSecret: this.configService.get<string>('auth.clientSecret') ?? '',
      timeout: 10000,
      retries: 3,
    };
  }

  private validateConfiguration(): void {
    const required = ['authCallback'];
    const missing = required.filter((field) => !this.config[field]);

    if (missing.length > 0) {
      throw new HubConfigurationException(`Missing required fields: ${missing.join(', ')}`);
    }

    try {
      new URL(this.config.authCallback);
    } catch {
      throw new HubConfigurationException('Invalid authCallback URL format');
    }

    this.logger.log('Configuration validated successfully');
  }

  private setupAxiosInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to: ${config.url}`);
        return config;
      },
      (error: unknown) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      },
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response received: ${response.status}`);
        return response;
      },
      (error: unknown) => {
        if (error instanceof AxiosError) {
          this.logger.error(`Response error: ${error.response?.status} - ${error.message}`);
        } else {
          this.logger.error('Response error:', error);
        }
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (
          error instanceof AxiosError &&
          error.response?.status &&
          error.response?.status >= 400 &&
          error.response?.status < 500
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`);
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }

  async exchangeCodeForUserInfo(code: string, context?: RequestContext): Promise<IValidateCodeResponse> {
    const requestContext: RequestContext = {
      correlationId: context?.correlationId || 'no-correlation-id',
      requestId: context?.requestId,
      userId: context?.userId,
      clientIp: context?.clientIp,
      userAgent: context?.userAgent,
    };

    const startTime = Date.now();

    this.logger.log(`[${requestContext.correlationId}] Exchanging authorization code for user info`);

    try {
      const result = await this.retryOperation(async () => {
        const response = await this.axiosInstance.post<
          IValidateCodeResponse,
          AxiosResponse<IValidateCodeResponse>,
          SsoValidateCodeInterface
        >(
          this.config.authCallback,
          {
            code,
            clientId: this.config.clientId,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.clientSecret}`,
              'X-Correlation-ID': requestContext.correlationId,
              'X-Request-ID': requestContext.requestId || requestContext.correlationId,
            },
          },
        );

        return response.data;
      }, this.config.retries);

      const responseTime = Date.now() - startTime;

      this.auditService.logCodeExchange(requestContext, true, responseTime);

      this.logger.log(`[${requestContext.correlationId}] Code exchange successful in ${responseTime}ms`);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      let thrownError: Error;

      if (error instanceof AxiosError) {
        const status = error.response?.status;

        if (status === 400) {
          thrownError = new InvalidAuthCodeException();
        } else if (status === 401) {
          thrownError = new HubAuthenticationException();
        } else if (error.code === 'ECONNABORTED') {
          thrownError = new HubTimeoutException();
        } else if (status && status >= 500) {
          thrownError = new HubServiceUnavailableException();
        } else {
          thrownError = new BadRequestException('Failed to validate authorization code');
        }

        this.auditService.logCodeExchange(requestContext, false, responseTime, thrownError.message, {
          errorType: error.constructor.name,
          statusCode: error.response?.status,
        });
      } else {
        this.logger.error(`[${requestContext.correlationId}] Unexpected error during code exchange:`, error);
        thrownError = new BadGatewayException('Hub service communication error');

        this.auditService.logCodeExchange(requestContext, false, responseTime, thrownError.message, {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          statusCode: undefined,
        });
      }

      this.logger.error(
        `[${requestContext.correlationId}] Code exchange failed in ${responseTime}ms: ${thrownError.message}`,
      );

      throw thrownError;
    }
  }
}

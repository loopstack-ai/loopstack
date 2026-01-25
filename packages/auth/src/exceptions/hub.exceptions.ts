import { HttpException, HttpStatus } from '@nestjs/common';

export class HubConfigurationException extends HttpException {
  constructor(message: string) {
    super(`Hub service configuration error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class HubServiceUnavailableException extends HttpException {
  constructor() {
    super('Hub service is temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class InvalidAuthCodeException extends HttpException {
  constructor() {
    super('Invalid or expired authorization code', HttpStatus.UNAUTHORIZED);
  }
}

export class HubAuthenticationException extends HttpException {
  constructor() {
    super('Failed to authenticate with hub service', HttpStatus.UNAUTHORIZED);
  }
}

export class HubTimeoutException extends HttpException {
  constructor() {
    super('Hub service request timeout', HttpStatus.REQUEST_TIMEOUT);
  }
}

import { ConfigService } from '@nestjs/config';

export function localBaseUrl(configService: ConfigService): string {
  const port = configService.get('PORT') ?? 3000;
  return `http://localhost:${port}`;
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class RiskControlAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedHex = this.config.get<string>('RISK_CONTROL_TOKEN_SHA256');
    if (!expectedHex) {
      throw new ServiceUnavailableException(
        'Emergency-stop HTTP control is not configured',
      );
    }

    const authorization = context.switchToHttp().getRequest<{
      headers: { authorization?: string | string[] };
    }>().headers.authorization;
    const token = bearerToken(authorization);
    if (!token) throw new UnauthorizedException('Invalid bearer token');

    const actual = createHash('sha256').update(token, 'utf8').digest();
    const expected = Buffer.from(expectedHex, 'hex');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new UnauthorizedException('Invalid bearer token');
    }
    return true;
  }
}

function bearerToken(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match?.[1];
}

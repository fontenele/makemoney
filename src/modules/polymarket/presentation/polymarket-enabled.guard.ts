import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PolymarketEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (!this.config.getOrThrow<boolean>('POLYMARKET_ENABLED')) {
      throw new ServiceUnavailableException(
        'Polymarket research is disabled by configuration',
      );
    }
    return true;
  }
}

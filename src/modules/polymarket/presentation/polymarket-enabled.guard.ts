import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PolymarketAvailabilityService } from '../application/polymarket-availability.service';

@Injectable()
export class PolymarketEnabledGuard implements CanActivate {
  constructor(private readonly availability: PolymarketAvailabilityService) {}

  canActivate(): boolean {
    if (!this.availability.isEnabled()) {
      throw new ServiceUnavailableException(
        'Polymarket research is disabled by local settings',
      );
    }
    return true;
  }
}

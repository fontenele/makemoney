import { Controller, Get } from '@nestjs/common';
import { SpotSymbolCatalogService } from '../application/spot-symbol-catalog.service';
import { SpotSymbolActivityTriggerService } from '../application/spot-symbol-activity-trigger.service';
import { SpotSymbolScannerStatus } from '../domain/spot-symbol-catalog';

@Controller('new-listings')
export class NewListingsScannerController {
  constructor(
    private readonly catalog: SpotSymbolCatalogService,
    private readonly activity: SpotSymbolActivityTriggerService,
  ) {}

  @Get('scanner-status')
  status(): SpotSymbolScannerStatus {
    return { ...this.catalog.status(), activityStream: this.activity.status() };
  }
}

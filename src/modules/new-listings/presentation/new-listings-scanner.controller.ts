import { Controller, Get } from '@nestjs/common';
import { SpotSymbolCatalogService } from '../application/spot-symbol-catalog.service';
import { SpotSymbolScannerStatus } from '../domain/spot-symbol-catalog';

@Controller('new-listings')
export class NewListingsScannerController {
  constructor(private readonly catalog: SpotSymbolCatalogService) {}

  @Get('scanner-status')
  status(): SpotSymbolScannerStatus {
    return this.catalog.status();
  }
}

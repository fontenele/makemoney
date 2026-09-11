import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  PAIR_METADATA_PROVIDER,
  PairMetadataProvider,
} from '../src/modules/market-data/domain/pair-metadata-provider';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const pairMetadataProvider: PairMetadataProvider = {
      load: () => Promise.resolve(null),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAIR_METADATA_PROVIDER)
      .useValue(pairMetadataProvider)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('/health (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server).get('/health').expect(200);
  });
});

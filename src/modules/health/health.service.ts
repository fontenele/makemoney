import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';

export interface HealthResponse {
  status: 'ok';
  services: {
    api: 'up';
    postgres: 'up';
    redis: 'up';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
    } catch {
      throw new ServiceUnavailableException(
        'A required service is unavailable',
      );
    }

    return {
      status: 'ok',
      services: { api: 'up', postgres: 'up', redis: 'up' },
    };
  }
}

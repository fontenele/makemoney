import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PrismaService =>
        new PrismaService(config.getOrThrow<string>('DATABASE_URL')),
    },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}

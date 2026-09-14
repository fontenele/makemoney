import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(databaseUrl: string) {
    super({ adapter: prismaAdapter(databaseUrl) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

export function databaseSchema(databaseUrl: string): string | undefined {
  const schema = new URL(databaseUrl).searchParams.get('schema') || undefined;
  if (schema && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error('Invalid PostgreSQL schema name');
  }
  return schema;
}

function prismaAdapter(databaseUrl: string): PrismaPg {
  const schema = databaseSchema(databaseUrl);
  return new PrismaPg(
    {
      connectionString: databaseUrl,
      ...(schema ? { options: `-c search_path=${schema}` } : {}),
    },
    { schema },
  );
}

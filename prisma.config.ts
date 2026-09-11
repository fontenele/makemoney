import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
  },
});

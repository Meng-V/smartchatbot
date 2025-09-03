import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Use direct connection without adapter for compatibility
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

import { TEST_DATABASE_URL } from './test-database';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.CORS_ORIGIN ??= 'http://localhost:5173';

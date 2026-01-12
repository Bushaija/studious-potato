import { Context, Next } from 'hono';

const allowedOrigins = [
  'http://localhost:2222',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://197.243.110.153',
  'http://197.243.110.153/rina',
  'http://197.243.110.153/api'
];

export const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }
  
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
  );
  c.header(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, DELETE'
  );
  
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 200);
  }
  
  await next();
};
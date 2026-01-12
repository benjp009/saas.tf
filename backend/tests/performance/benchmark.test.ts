import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Performance Benchmarks', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'perf@test.com',
      password: 'Test123456',
      firstName: 'Performance',
      lastName: 'Test',
    });

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.subdomain.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('API Response Times', () => {
    it('health check should respond within 100ms', async () => {
      const start = Date.now();
      await request(app).get('/health').expect(200);
      const duration = Date.now() - start;

      console.log(`Health check: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('authentication should respond within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'perf@test.com',
          password: 'Test123456',
        })
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Authentication: ${duration}ms`);
      expect(duration).toBeLessThan(500);
    });

    it('get subdomains should respond within 300ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Get subdomains: ${duration}ms`);
      expect(duration).toBeLessThan(300);
    });

    it('check availability should respond within 200ms', async () => {
      const start = Date.now();
      await request(app).get('/api/v1/subdomains/check/testname').expect(200);
      const duration = Date.now() - start;

      console.log(`Check availability: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('get subscription plans should respond within 100ms', async () => {
      const start = Date.now();
      await request(app).get('/api/v1/subscriptions/plans').expect(200);
      const duration = Date.now() - start;

      console.log(`Get plans: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 10 concurrent subdomain list requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/subdomains')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      console.log(`10 concurrent requests: ${duration}ms`);
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(2000); // All 10 should complete within 2s
    });

    it('should handle 5 concurrent availability checks', async () => {
      const names = ['test1', 'test2', 'test3', 'test4', 'test5'];
      const promises = names.map((name) =>
        request(app).get(`/api/v1/subdomains/check/${name}`)
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      console.log(`5 concurrent availability checks: ${duration}ms`);
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Database Query Performance', () => {
    beforeAll(async () => {
      // Create 10 test subdomains
      const promises = Array.from({ length: 10 }, (_, i) =>
        prisma.subdomain.create({
          data: {
            name: `perftest${i}`,
            ipAddress: '192.168.1.1',
            userId,
            isActive: true,
          },
        })
      );
      await Promise.all(promises);
    });

    it('should query 10 subdomains within 200ms', async () => {
      const start = Date.now();
      await prisma.subdomain.findMany({
        where: { userId },
      });
      const duration = Date.now() - start;

      console.log(`Query 10 subdomains: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('should count subdomains within 100ms', async () => {
      const start = Date.now();
      await prisma.subdomain.count({
        where: { userId, isActive: true },
      });
      const duration = Date.now() - start;

      console.log(`Count subdomains: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('should query subscriptions with quota within 200ms', async () => {
      const start = Date.now();
      await prisma.subscription.findMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
        },
      });
      const duration = Date.now() - start;

      console.log(`Query subscriptions: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory and Load', () => {
    it('should handle rapid sequential requests', async () => {
      const count = 20;
      const start = Date.now();

      for (let i = 0; i < count; i++) {
        await request(app)
          .get('/api/v1/subdomains')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      const duration = Date.now() - start;
      const avgDuration = duration / count;

      console.log(`20 sequential requests: ${duration}ms (avg: ${avgDuration}ms)`);
      expect(avgDuration).toBeLessThan(200); // Average should be under 200ms
    });

    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        await request(app).get('/health').expect(200);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory increase after 50 requests: ${memoryIncrease.toFixed(2)}MB`);
      expect(memoryIncrease).toBeLessThan(50); // Should not increase by more than 50MB
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should enforce rate limits without degrading performance', async () => {
      const start = Date.now();

      // Make requests up to the rate limit
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      await Promise.all(promises);
      const duration = Date.now() - start;

      console.log(`10 requests with rate limiting: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });
});

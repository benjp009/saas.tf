import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('E2E: Complete Subscription Flow', () => {
  let authToken: string;
  let userId: string;
  let subdomainId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.subdomain.deleteMany({ where: { name: { startsWith: 'e2etest' } } });
    await prisma.user.deleteMany({ where: { email: 'e2e@test.com' } });
  });

  afterAll(async () => {
    // Clean up
    await prisma.subdomain.deleteMany({ where: { name: { startsWith: 'e2etest' } } });
    await prisma.user.deleteMany({ where: { email: 'e2e@test.com' } });
    await prisma.$disconnect();
  });

  describe('1. User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e@test.com',
          password: 'Test123456',
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('e2e@test.com');

      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('should get current user info', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.user.email).toBe('e2e@test.com');
    });
  });

  describe('2. Free Tier - Subdomain Creation', () => {
    it('should check quota for new user (2 free subdomains)', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/quota')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.quota).toBe(2);
      expect(res.body.used).toBe(0);
      expect(res.body.allowed).toBe(true);
    });

    it('should create first subdomain', async () => {
      const res = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'e2etest1',
          ipAddress: '192.168.1.1',
        })
        .expect(201);

      expect(res.body.subdomain.name).toBe('e2etest1');
      subdomainId = res.body.subdomain.id;
    });

    it('should create second subdomain', async () => {
      const res = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'e2etest2',
          ipAddress: '192.168.1.2',
        })
        .expect(201);

      expect(res.body.subdomain.name).toBe('e2etest2');
    });

    it('should reject third subdomain (quota exceeded)', async () => {
      const res = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'e2etest3',
          ipAddress: '192.168.1.3',
        })
        .expect(403);

      expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
      expect(res.body.error).toHaveProperty('upgradeInfo');
    });

    it('should list all user subdomains', async () => {
      const res = await request(app)
        .get('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.subdomains).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.quota.used).toBe(2);
      expect(res.body.quota.total).toBe(2);
    });
  });

  describe('3. Subdomain Management', () => {
    it('should update subdomain IP address', async () => {
      const res = await request(app)
        .patch(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ipAddress: '192.168.1.100',
        })
        .expect(200);

      expect(res.body.subdomain.ipAddress).toBe('192.168.1.100');
    });

    it('should not allow updating another user\'s subdomain', async () => {
      // Create another user
      const res2 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'other@test.com',
          password: 'Test123456',
        });

      const otherToken = res2.body.token;

      // Try to update first user's subdomain
      await request(app)
        .patch(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          ipAddress: '192.168.1.200',
        })
        .expect(403);

      // Clean up other user
      await prisma.user.delete({ where: { email: 'other@test.com' } });
    });

    it('should check subdomain availability', async () => {
      const res = await request(app)
        .get('/api/v1/subdomains/check/available-name')
        .expect(200);

      expect(res.body.available).toBe(true);
    });

    it('should reject reserved subdomain names', async () => {
      const res = await request(app)
        .get('/api/v1/subdomains/check/www')
        .expect(200);

      expect(res.body.available).toBe(false);
      expect(res.body.reason).toContain('reserved');
    });
  });

  describe('4. Subscription Plans', () => {
    it('should list available subscription plans', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/plans')
        .expect(200);

      expect(res.body.plans).toHaveLength(3);
      expect(res.body.plans.some((p: any) => p.id === 'FREE')).toBe(true);
      expect(res.body.plans.some((p: any) => p.id === 'PACKAGE_5')).toBe(true);
      expect(res.body.plans.some((p: any) => p.id === 'PACKAGE_50')).toBe(true);
    });

    it('should get current user subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.totalQuota).toBe(2);
      expect(res.body.totalUsed).toBe(2);
      expect(res.body.subscriptions).toHaveLength(1); // Only FREE plan
      expect(res.body.subscriptions[0].plan).toBe('FREE');
    });
  });

  describe('5. Error Handling', () => {
    it('should reject invalid email on registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123456',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid IP address', async () => {
      const res = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'invalidip',
          ipAddress: '999.999.999.999',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid subdomain name', async () => {
      const res = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'in',
          ipAddress: '192.168.1.1',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/subdomains').expect(401);

      await request(app)
        .post('/api/v1/subdomains')
        .send({
          name: 'test',
          ipAddress: '192.168.1.1',
        })
        .expect(401);
    });

    it('should handle not found routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent').expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('6. Subdomain Deletion', () => {
    it('should delete subdomain', async () => {
      await request(app)
        .delete(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should update quota after deletion', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/quota')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.used).toBe(1);
      expect(res.body.allowed).toBe(true);
    });

    it('should not find deleted subdomain', async () => {
      const res = await request(app)
        .get(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});

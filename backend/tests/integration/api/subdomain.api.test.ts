import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/config/database';
import { dnsService } from '../../../src/services/dns.service';

// Mock DNS service to avoid real GCP calls during tests
jest.mock('../../../src/services/dns.service', () => ({
  dnsService: {
    createARecord: jest.fn().mockResolvedValue({
      success: true,
      recordId: 'test.saas.tf.',
    }),
    updateARecord: jest.fn().mockResolvedValue({
      success: true,
      recordId: 'test.saas.tf.',
    }),
    deleteARecord: jest.fn().mockResolvedValue({
      success: true,
    }),
    recordExists: jest.fn().mockResolvedValue(false),
  },
}));

describe('Subdomain API Endpoints', () => {
  let authToken: string;
  let userId: string;

  // Setup: Create a test user and get auth token
  beforeAll(async () => {
    const testUser = {
      email: 'subdomain-test@test.com',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  // Clean up subdomains before each test
  beforeEach(async () => {
    await prisma.subdomain.deleteMany({
      where: { userId },
    });
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.subdomain.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/subdomains', () => {
    it('should create a subdomain with valid data', async () => {
      const subdomainData = {
        name: 'myapp',
        ipAddress: '192.168.1.1',
      };

      const response = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(subdomainData.name);
      expect(response.body.ipAddress).toBe(subdomainData.ipAddress);
      expect(response.body).toHaveProperty('fullDomain');
      expect(dnsService.createARecord).toHaveBeenCalledWith(
        subdomainData.name,
        subdomainData.ipAddress
      );
    });

    it('should reject subdomain creation without authentication', async () => {
      const subdomainData = {
        name: 'myapp',
        ipAddress: '192.168.1.1',
      };

      await request(app)
        .post('/api/v1/subdomains')
        .send(subdomainData)
        .expect(401);
    });

    it('should reject invalid subdomain name', async () => {
      const subdomainData = {
        name: 'ab', // Too short
        ipAddress: '192.168.1.1',
      };

      const response = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid IP address', async () => {
      const subdomainData = {
        name: 'myapp',
        ipAddress: '999.999.999.999',
      };

      const response = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject reserved subdomain names', async () => {
      const subdomainData = {
        name: 'admin', // Reserved
        ipAddress: '192.168.1.1',
      };

      const response = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reserved');
    });

    it('should reject duplicate subdomain names', async () => {
      const subdomainData = {
        name: 'duplicate',
        ipAddress: '192.168.1.1',
      };

      // Create first subdomain
      await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subdomainData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/subdomains', () => {
    beforeEach(async () => {
      // Create test subdomains
      await prisma.subdomain.createMany({
        data: [
          {
            name: 'app1',
            ipAddress: '192.168.1.1',
            userId,
            dnsRecordId: 'app1.saas.tf.',
          },
          {
            name: 'app2',
            ipAddress: '192.168.1.2',
            userId,
            dnsRecordId: 'app2.saas.tf.',
          },
        ],
      });
    });

    it('should list all user subdomains', async () => {
      const response = await request(app)
        .get('/api/v1/subdomains')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('fullDomain');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/subdomains').expect(401);
    });
  });

  describe('GET /api/v1/subdomains/check/:name', () => {
    it('should check available subdomain', async () => {
      const response = await request(app)
        .get('/api/v1/subdomains/check/available')
        .expect(200);

      expect(response.body).toHaveProperty('available', true);
    });

    it('should detect taken subdomain', async () => {
      // Create a subdomain first
      await prisma.subdomain.create({
        data: {
          name: 'taken',
          ipAddress: '192.168.1.1',
          userId,
          dnsRecordId: 'taken.saas.tf.',
        },
      });

      const response = await request(app)
        .get('/api/v1/subdomains/check/taken')
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body.reason).toBe('already_taken');
    });

    it('should detect reserved subdomain', async () => {
      const response = await request(app)
        .get('/api/v1/subdomains/check/admin')
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body.reason).toBe('reserved');
    });
  });

  describe('PATCH /api/v1/subdomains/:id', () => {
    let subdomainId: string;

    beforeEach(async () => {
      const subdomain = await prisma.subdomain.create({
        data: {
          name: 'updatetest',
          ipAddress: '192.168.1.1',
          userId,
          dnsRecordId: 'updatetest.saas.tf.',
        },
      });
      subdomainId = subdomain.id;
    });

    it('should update subdomain IP address', async () => {
      const newIp = '192.168.1.100';

      const response = await request(app)
        .patch(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ipAddress: newIp })
        .expect(200);

      expect(response.body.ipAddress).toBe(newIp);
      expect(dnsService.updateARecord).toHaveBeenCalled();
    });

    it('should reject invalid IP address', async () => {
      await request(app)
        .patch(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ipAddress: 'invalid' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/subdomains/${subdomainId}`)
        .send({ ipAddress: '192.168.1.100' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/subdomains/:id', () => {
    let subdomainId: string;

    beforeEach(async () => {
      const subdomain = await prisma.subdomain.create({
        data: {
          name: 'deletetest',
          ipAddress: '192.168.1.1',
          userId,
          dnsRecordId: 'deletetest.saas.tf.',
        },
      });
      subdomainId = subdomain.id;
    });

    it('should delete subdomain', async () => {
      await request(app)
        .delete(`/api/v1/subdomains/${subdomainId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      const subdomain = await prisma.subdomain.findUnique({
        where: { id: subdomainId },
      });
      expect(subdomain).toBeNull();
      expect(dnsService.deleteARecord).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/v1/subdomains/${subdomainId}`)
        .expect(401);
    });

    it('should return 404 for non-existent subdomain', async () => {
      await request(app)
        .delete('/api/v1/subdomains/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

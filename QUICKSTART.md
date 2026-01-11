# Quick Start Guide

## Starting the Development Environment

### 1. Start PostgreSQL (if not running)
```bash
brew services start postgresql@14
```

### 2. Start Backend Server
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:4000

### 3. Start Frontend Server
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:3000

## Testing the Application

### Access the Application
1. Open http://localhost:3000 in your browser
2. Click "Get Started" or "Sign up"
3. Create an account with:
   - Email: your@email.com
   - Password: Must have uppercase, lowercase, number, special character (min 8 chars)
   - Example: `Test123!@#`
4. After registration, you'll be logged in and redirected to dashboard

### Test with API Directly
```bash
# Register a user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","firstName":"Test"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Get current user (use token from login response)
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Useful Commands

### Database
```bash
# Open Prisma Studio (visual database browser)
cd backend
npm run prisma:studio

# Create a new migration after schema changes
npm run prisma:migrate

# Generate Prisma Client after schema changes
npm run prisma:generate

# View database directly
psql -d saasdev
```

### Backend
```bash
# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### Frontend
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## Environment Variables

### Backend (.env)
Located at: `backend/.env`
Already configured with:
- Database connection
- JWT secret
- GCP credentials
- CORS settings

### Frontend (.env.local)
Located at: `frontend/.env.local`
Already configured with:
- API URL
- App configuration

## Troubleshooting

### Backend won't start
1. Check if PostgreSQL is running: `brew services list`
2. Check database connection: `psql -d saasdev`
3. Check logs in terminal

### Frontend won't start
1. Make sure backend is running first
2. Check for port conflicts (port 3000)
3. Clear Next.js cache: `rm -rf frontend/.next`

### Database errors
1. Restart PostgreSQL: `brew services restart postgresql@14`
2. Check migrations: `cd backend && npm run prisma:migrate`
3. Reset database (WARNING - deletes data):
   ```bash
   dropdb saasdev
   createdb saasdev
   cd backend && npm run prisma:migrate
   ```

### CORS errors
1. Make sure `FRONTEND_URL` in backend `.env` matches frontend URL
2. Check browser console for specific error
3. Restart backend server

## Project Structure
```
saas.tf/
├── backend/          # Express.js API
│   ├── src/
│   │   ├── config/   # Configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── prisma/
│       └── schema.prisma # Database schema
├── frontend/         # Next.js app
│   └── src/
│       ├── app/      # Pages (App Router)
│       ├── components/  # React components
│       ├── lib/      # API client, utilities
│       ├── store/    # Zustand state
│       └── types/    # TypeScript types
└── PROGRESS.md       # Development progress log
```

## Next Development Tasks

See [PROGRESS.md](PROGRESS.md) for detailed progress and next steps.

**Current Phase:** Day 5-7: Subdomain Management
- Implement DNS service (Google Cloud DNS)
- Build subdomain CRUD operations
- Create dashboard UI

## Resources

- [Implementation Plan](./.claude/plans/happy-leaping-hedgehog.md) - Full project plan
- [Progress Log](./PROGRESS.md) - What's been built
- [API Documentation](./docs/API.md) - API endpoints (to be created)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Status:** ✅ Authentication system complete and tested
**Servers:** Both running and healthy
**Database:** Migrated and connected

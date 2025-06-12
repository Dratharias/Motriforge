# Motriforge Platform - QuickStart Guide

Get up and running with Motriforge in 5 minutes! 🚀

## ✅ Prerequisites

Ensure you have these installed:
- Node.js 18+ 
- PostgreSQL 16+
- Docker & Docker Compose (optional)

## 🚀 Quick Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd motriforge-platform
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your database credentials
```

**Generate secure secrets:**
```bash
# Generate JWT secrets (32 characters each)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For REFRESH_TOKEN_SECRET
```

**Key environment variables:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/motriforge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-generated-32-char-hex-secret
REFRESH_TOKEN_SECRET=your-generated-32-char-hex-secret
```

### 3. Database Setup

**Create PostgreSQL user and database:**
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# In PostgreSQL shell, run these commands:
# (Replace 'myuser' and 'mypassword' with your preferred credentials)
```

```sql
CREATE USER myuser WITH PASSWORD 'mypassword';
ALTER USER myuser CREATEDB CREATEROLE SUPERUSER;
CREATE DATABASE motriforge OWNER myuser;
GRANT ALL PRIVILEGES ON DATABASE motriforge TO myuser;
\q
```

**Update your .env file with these credentials:**
```env
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/motriforge
```

**Test the connection:**
```bash
psql postgresql://myuser:mypassword@localhost:5432/motriforge
# Should connect successfully, then type \q to exit
```

### 4. Run Migrations & Seed Data
```bash
npm run db:generate    # Generate migration files
npm run db:migrate     # Apply migrations
npm run db:seed        # Seed initial data
```

### 5. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 🔍 Verify Setup

### ✅ Health Check
```bash
curl -v http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-12T15:10:18.685Z",
  "version": "0.1.0",
  "environment": "development",
  "services": {
    "database": "healthy",
    "cache": "healthy"
  },
  "uptime": 0
}
```

### ✅ Database Studio
```bash
npm run db:studio
```
Opens: https://local.drizzle.studio

**Drizzle Studio provides:**
- Visual database browser
- Table data editing
- Query execution
- Schema relationships
- Real-time data updates

**Verify these tables exist with data:**
- `severity_classification` (19 rows)
- `event_actor_type` (5 rows)  
- `event_action_type` (10 rows)
- `event_scope_type` (8 rows)
- `event_target_type` (10 rows)

## 🐳 Docker Alternative

If you prefer Docker:

```bash
# Start all services
npm run docker:up

# View logs  
npm run docker:logs

# Stop services
npm run docker:down
```

## 🧪 Run Tests

```bash
npm test              # Run test suite
npm run test:ui       # Interactive test UI
npm run test:coverage # Coverage report
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:studio` | Open database studio |
| `npm run db:generate` | Generate new migration |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed development data |
| `npm run lint` | Check code quality |
| `npm run format` | Format code |

## 📊 Observability Features

### Severity Classification System
The platform includes a unified severity system:
- **Types**: debug, info, warn, error, audit, lifecycle
- **Levels**: negligeable → critical (7 levels)
- **Notifications**: Automatic alerts for high-severity events

### Actor.Action.Scope.Target Pattern
Consistent event categorization:
- **Actor**: Who (user, system, service, admin, api)
- **Action**: What (create, read, update, delete, login, etc.)
- **Scope**: Where (system, domain, user, api, etc.)
- **Target**: On what (user, resource, database, cache, etc.)

## 🗂️ Project Structure

```
/
├── src/                    # Frontend SolidJS app
├── backend/
│   ├── shared/            # Types, utils, constants
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── database/          # Schema, migrations
│   └── routes/            # API endpoints
├── tests/                 # Test files
└── scripts/               # Build scripts
```

## 🔧 Next Steps

1. **Explore the codebase** - Check out the observability system structure
2. **Build services** - Create logging, audit, and error tracking services
3. **Add frontend features** - Build user interfaces
4. **Extend API** - Add more endpoints as needed
5. **Deploy** - Set up production environment

## 🆘 Quick Troubleshooting

### Database Connection
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql $DATABASE_URL
```

### Dev Server Issues
```bash
# Kill any process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

## 📞 Support

- Check the main [README.md](./README.md) for detailed documentation
- Review database schema in `backend/database/schema/`
- Examine observability types in `backend/shared/types/`
- Test API endpoints at `/api/health`

---

🎉 **You're all set!** Start building amazing fitness platform features on this solid foundation.

Happy coding! 💪
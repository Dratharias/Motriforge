# Ravenforge Fitness - Full Stack Migration

This project has been migrated from Next.js to a separated architecture:
- **Frontend**: React SPA with Vite
- **Backend**: Hono API server

## Project Structure

```
├── frontend/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/api.ts
│   └── package.json
├── backend/           # Hono API server
│   ├── src/
│   │   ├── api/
│   │   ├── lib/
│   │   └── modules/
│   └── package.json
└── docker-compose.yml
```

## Quick Start

### Development with Docker
```bash
docker-compose up
```

### Manual Development

#### Backend
```bash
cd backend
bun install
bun run dev
```

#### Frontend  
```bash
cd frontend
npm install
npm run dev
```

## Key Changes

1. **API calls**: Updated to use axios instead of internal API routes
2. **Routing**: Migrated from Next.js Router to React Router
3. **Auth**: Moved to token-based auth with API client
4. **Build**: Frontend uses Vite for faster development

## Deployment

### Frontend (Cloudflare Pages)
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Backend (Cloudflare Workers, OVH, etc.)
```bash
cd backend
bun run build
# Deploy to your preferred platform
```

## Migration Notes

- Review and update any Next.js specific code
- Update environment variables
- Test all API integrations
- Update deployment scripts

# Ravenforge Backend

API server built with Hono framework.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

## Structure

- `src/api/` - Hono API routes
- `src/lib/` - Shared utilities and database models
- `src/modules/` - Feature modules (auth, validation, etc.)

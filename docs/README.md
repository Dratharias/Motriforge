# Database Schema Documentation

## Overview
This documentation covers the complete database schema for the fitness platform application built with TypeScript, PostgreSQL, SolidStart, SolidJS, and Tailwind CSS.

## Schema Organization

### Core Domain
- **[foundation](./core/foundation.md)** - Base enums, lookup tables, and foundational entities
- **[users](./core/users.md)** - User management and authentication
- **[permissions](./core/permissions.md)** - Role-based access control
- **[content](./core/content.md)** - Content validation and moderation
- **[muscles](./core/muscles.md)** - Anatomy and muscle group definitions
- **[cross-domain](./core/cross-domain.md)** - Cross-domain relationships and events
- **[data-lifecycle](./core/data-lifecycle.md)** - Data archiving and retention policies
- **[performance](./core/performance.md)** - Database performance monitoring

### Business Domains
- **[exercises](./exercises/core.md)** - Exercise definitions and management
- **[equipment](./equipment/core.md)** - Equipment catalog and management
- **[workouts](./workouts/core.md)** - Workout definitions and composition
- **[programs](./programs/core.md)** - Training program management
- **[goals](./goals/core.md)** - Goal setting and tracking
- **[institutions](./institutions/core.md)** - Institution and organization management
- **[media](./media/core.md)** - Media asset management
- **[ratings](./ratings/core.md)** - Rating and review system
- **[favorites](./favorites/core.md)** - User favorites and collections

### User Experience
- **[activities](./activities/core.md)** - Activity tracking and logging
- **[progress](./progress/core.md)** - User progress and measurements
- **[notifications](./notifications/core.md)** - Notification system
- **[i18n](./i18n/core.md)** - Internationalization and translations

### System Infrastructure
- **[audit](./audit/core.md)** - Audit logging and compliance
- **[errors](./errors/core.md)** - Error handling and monitoring
- **[cache](./cache/core.md)** - Cache management system
- **[settings](./settings/core.md)** - System and user settings
- **[payments](./payments/core.md)** - Payment and subscription management

## Schema Standards

### Field Constraints
- **VARCHAR(50)** - Short identifiers, codes, names
- **VARCHAR(100)** - Medium identifiers, display names
- **VARCHAR(255)** - Long identifiers, titles, URLs
- **TEXT LENGTH 500** - Short descriptions
- **TEXT LENGTH 1000** - Medium descriptions
- **TEXT LENGTH 2000** - Long descriptions, notes
- **TEXT LENGTH 5000** - Detailed instructions
- **TEXT LENGTH 10000** - Large content blocks

### Common Patterns
- All tables include `created_by`, `created_at`, `is_active`
- Content tables include `updated_at`
- User-facing content includes `visibility_id`
- Many-to-many relationships use composite primary keys
- Audit fields: `UUID created_by FK "NOT NULL"`, `TIMESTAMP created_at "NOT NULL DEFAULT now()"`

### Naming Conventions
- Tables: SNAKE_CASE (e.g., `USER_ROLE`)
- Fields: snake_case (e.g., `created_at`)
- Foreign Keys: `{table}_id` (e.g., `user_id`)
- Enums: UPPER_CASE values
- Indexes: `idx_{table}_{columns}`

## Cross-Domain Relationships
The system uses a resource registry pattern for cross-domain references, allowing different domains to reference each other without tight coupling through the `RESOURCE_REGISTRY` and `CROSS_DOMAIN_REFERENCE` tables.


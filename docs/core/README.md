# Core Domain Documentation

> **Foundation layer providing system-wide enums, permissions, and cross-domain utilities**

## 📋 **Domain Overview**

The Core domain serves as the foundation for all other domains, providing:
- **Enumeration tables** for consistent system-wide lookups
- **Permission system** with role-based access control (RBAC)
- **Cross-domain relationship management** for referential integrity
- **Performance monitoring** and optimization tools
- **Content management** with validation and moderation

---

## 📁 **Files in this Domain**

| File | Purpose | Key Tables | Implementation Phase |
|------|---------|------------|---------------------|
| [`enums.md`](./enums.md) | Core lookup tables and hierarchies | `TAG`, `CATEGORY`, `STATUS`, `METRIC`, `VISIBILITY`, `DIFFICULTY_LEVEL` | Phase 1 - MVP |
| [`muscles.md`](./muscles.md) | Anatomy and muscle targeting system | `MUSCLE`, `MUSCLE_ZONE`, `TISSUE_TYPE`, `MUSCLE_LEVEL` | Phase 1 - MVP |
| [`permission.md`](./permission.md) | Role-based access control system | `ROLE`, `PERMISSION`, `ROLE_PERMISSION`, `PERMISSION_GRANT` | Phase 1 - MVP |
| [`cross_domain_relationships.md`](./cross_domain_relationships.md) | Cross-domain referential integrity | `RESOURCE_REGISTRY`, `CROSS_DOMAIN_REFERENCE`, `DOMAIN_EVENT` | Phase 3 - Platform |
| [`content_management.md`](./content_management.md) | Text validation and moderation | `CONTENT_TYPE`, `CONTENT_VALIDATION_LOG`, `PROFANITY_FILTER` | Phase 2 - Core |
| [`performance_monitoring.md`](./performance_monitoring.md) | Database performance optimization | `INDEX_STRATEGY`, `QUERY_PERFORMANCE_LOG`, `INDEX_USAGE_STATS` | Phase 4 - Enterprise |
| [`data_lifecycle.md`](./data_lifecycle.md) | Data retention and partitioning | `PARTITION_STRATEGY`, `DATA_LIFECYCLE_POLICY`, `DATA_ARCHIVE_LOG` | Phase 4 - Enterprise |

---

## 🎯 **Implementation Priority**

### **Phase 1 - Foundation (Critical)**
```sql
-- Implement first (dependencies for all other domains)
1. enums.md         -- System-wide lookups
2. muscles.md       -- Exercise targeting
3. permission.md    -- Security foundation
```

### **Phase 2 - Quality Assurance**
```sql
-- Content validation and safety
4. content_management.md
```

### **Phase 3 - Cross-Domain Integration**
```sql
-- Advanced referential integrity
5. cross_domain_relationships.md
```

### **Phase 4 - Performance & Scale**
```sql
-- Performance optimization
6. performance_monitoring.md
7. data_lifecycle.md
```

---

## 🔗 **Domain Dependencies**

### **Dependencies (Core depends on)**
- None (Foundation layer)

### **Dependents (Domains that depend on Core)**
- **user/** - Uses `ROLE`, `PERMISSION`, `TAG`, `CATEGORY`
- **exercise/** - Uses `MUSCLE`, `DIFFICULTY_LEVEL`, `TAG`, `CATEGORY`
- **workout/** - Uses `MUSCLE`, `DIFFICULTY_LEVEL`, `STATUS`
- **program/** - Uses `DIFFICULTY_LEVEL`, `STATUS`, `TAG`
- **All domains** - Use `VISIBILITY`, `TAG`, `CATEGORY` for classification

---

## 🏗️ **Key Architecture Patterns**

### **1. Enumeration Pattern**
```sql
-- Extensible enums with metadata
TAG {
  name ENUM,
  type ENUM,
  description TEXT,
  is_system_tag BOOLEAN
}
```

### **2. Hierarchical Data**
```sql
-- Materialized path for efficient queries
CATEGORY {
  hierarchy_path VARCHAR(500),  -- '/1/2/3/'
  hierarchy_level SMALLINT,
  parent_category_id UUID
}
```

### **3. Policy-Based Configuration**
```sql
-- Flexible, configurable business rules
PERMISSION {
  actor VARCHAR(50),
  resource VARCHAR(50), 
  action VARCHAR(50),
  scope VARCHAR(50)
}
```

### **4. Cross-Domain Event Pattern**
```sql
-- Event-driven consistency across domains
DOMAIN_EVENT {
  event_type ENUM,
  resource_id UUID,
  resource_type ENUM,
  event_payload JSONB
}
```

---

## 📊 **Performance Considerations**

### **High-Frequency Tables**
- `PERMISSION_CHECK_LOG` - Consider daily partitioning
- `QUERY_PERFORMANCE_LOG` - Implement retention policies
- `DOMAIN_EVENT` - Queue-based processing recommended

### **Indexing Strategy**
```sql
-- Hierarchical queries
CREATE INDEX idx_category_hierarchy_path ON category (hierarchy_path);

-- Permission checks (most frequent queries)
CREATE INDEX idx_permission_actor_resource ON permission (actor, resource, action);

-- Cross-domain lookups
CREATE INDEX idx_resource_registry_type ON resource_registry (resource_type, resource_status);
```

### **Caching Recommendations**
- Cache permission hierarchies in Redis
- Cache active categories/tags in application memory
- Cache muscle targeting data for exercise queries

---

## 🔒 **Security Implications**

### **Permission System**
- Implements **Role-Based Access Control (RBAC)**
- Supports **hierarchical roles** with inheritance
- Provides **context-aware permissions** (scope-based)
- Enables **temporary privilege elevation** with audit trails

### **Data Classification**
- `VISIBILITY` controls data access levels
- `CONTENT_TYPE` enforces content validation rules
- `PROFANITY_FILTER` ensures content safety

### **Audit Requirements**
- All permission checks logged in `PERMISSION_CHECK_LOG`
- Cross-domain operations tracked in `DOMAIN_EVENT`
- Content validation history in `CONTENT_VALIDATION_LOG`

---

## 🧪 **Testing Considerations**

### **Unit Tests Required**
- Permission resolution logic
- Hierarchical category queries
- Cross-domain reference validation
- Content validation rules

### **Integration Tests Required**
- Permission inheritance chains
- Event-driven cross-domain updates
- Performance monitoring thresholds
- Data lifecycle automation

### **Performance Tests Required**
- Permission check latency under load
- Hierarchical query performance
- Cross-domain event processing throughput
- Index effectiveness monitoring

---

## 🔧 **Migration Strategy**

### **Initial Setup**
```sql
-- 1. Create core schemas
CREATE SCHEMA core;
CREATE SCHEMA security;

-- 2. Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 3. Implement in order
-- enums.md → muscles.md → permission.md → others
```

### **Seed Data Requirements**
- Default difficulty levels (BEGINNER → EXPERT)
- Core muscle groups and zones
- Basic permission structure
- System-wide status values
- Default visibility levels

---

## 📈 **Monitoring & Alerting**

### **Key Metrics to Monitor**
- Permission check latency (target: <10ms)
- Cross-domain event processing lag
- Content validation queue depth
- Index usage statistics

### **Alerting Thresholds**
- Permission check failures >1%
- Content moderation queue >100 items
- Database query time >1000ms
- Index scan ratio <95%

---

**Domain Owner**: Core Platform Team  
**Last Updated**: December 2024  
**Implementation Status**: Foundation Complete, Performance Features Planned


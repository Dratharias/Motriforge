# User Domain Documentation

> **Complete user management system with identity, progress tracking, and access control**

## 📋 **Domain Overview**

The User domain manages all aspects of user lifecycle:
- **Identity Management** - Authentication, profiles, preferences
- **Access Control** - Roles, permissions, institutional relationships  
- **Progress Tracking** - Workout sessions, measurements, goal achievement
- **Personalization** - Settings, language preferences, activity history

---

## 📁 **Files in this Domain**

| File | Purpose | Key Tables | Implementation Phase |
|------|---------|------------|---------------------|
| [`core.md`](./core.md) | User identity and basic profile | `USER`, `USER_SETTING`, `USER_CATEGORY`, `USER_TAG` | Phase 1 - MVP |
| [`roles.md`](./roles.md) | User permissions and access control | `USER_ROLE`, `USER_PERMISSION` | Phase 1 - MVP |
| [`progress.md`](./progress.md) | Workout tracking and measurements | `USER_PROGRAM_ENROLLMENT`, `USER_WORKOUT_SESSION`, `USER_EXERCISE_PERFORMANCE` | Phase 2 - Core |

---

## 🎯 **Implementation Priority**

### **Phase 1 - Identity Foundation**
```sql
-- Core user management (Required for all features)
1. core.md          -- User profiles and settings
2. roles.md         -- Permission system integration
```

### **Phase 2 - Activity Tracking**  
```sql
-- Progress and engagement features
3. progress.md      -- Workout sessions and measurements
```

---

## 🔗 **Domain Dependencies**

### **Dependencies (User depends on)**
- **core/** - `ROLE`, `PERMISSION`, `SETTING`, `VISIBILITY`, `TAG`, `CATEGORY`
- **program/** - `PROGRAM` (for enrollments)
- **workout/** - `WORKOUT`, `EXERCISE_INSTRUCTION` (for sessions)
- **goals/** - `GOAL`, `METRIC` (for measurements)

### **Dependents (Domains that depend on User)**
- **All domains** - Use `USER` for audit trails (`created_by`, `updated_by`)
- **institution/** - `USER_INSTITUTION_RELATIONSHIP`
- **payment/** - `SUBSCRIPTION` linked to users
- **activity/** - `ACTIVITY` performed by users
- **favorite/** - `FAVORITE` owned by users
- **rating/** - `RATING` created by users
- **audit/** - `AUDIT_LOG` tracks user actions

---

## 🏗️ **Key Architecture Patterns**

### **1. Soft Profile Pattern**
```sql
-- Minimal required fields, rich optional data
USER {
  email VARCHAR(255) NOT NULL,      -- Required
  first_name VARCHAR(255) NOT NULL, -- Required  
  date_of_birth DATE NULLABLE,      -- Optional
  notes TEXT NULLABLE               -- Optional
}
```

### **2. Flexible Settings System**
```sql
-- Type-safe, configurable user preferences
USER_SETTING {
  setting_id FK,    -- References SETTING.id
  value JSONB,      -- Validated against SETTING.data_type
  is_default BOOLEAN
}
```

### **3. Scoped Permission Assignment**
```sql
-- Context-aware permissions (institution, department, global)
USER_ROLE {
  scope_id UUID,           -- institution_id or department_id
  scope_type ENUM,         -- 'INSTITUTION', 'DEPARTMENT', 'GLOBAL'
  expires_at TIMESTAMP     -- Temporary role assignments
}
```

### **4. Comprehensive Progress Tracking**
```sql
-- Detailed workout session data
USER_WORKOUT_SESSION {
  session_status ENUM,              -- 'PLANNED', 'IN_PROGRESS', 'COMPLETED'
  effort_rating SMALLINT,           -- 1-10 subjective difficulty
  soreness_rating SMALLINT,         -- 0-10 post-workout soreness
  actual_duration_seconds SMALLINT  -- Real vs estimated time
}
```

---

## 📊 **Performance Considerations**

### **High-Volume Tables**
- `USER_WORKOUT_SESSION` - Most frequent writes, consider partitioning by user_id or date
- `USER_EXERCISE_PERFORMANCE` - Detailed exercise tracking, archive old data
- `USER_MEASUREMENT` - Time-series data, optimize for date range queries

### **Critical Indexes**
```sql
-- Authentication (most frequent query)
CREATE UNIQUE INDEX idx_user_email ON user (email) WHERE is_active = true;

-- Progress tracking queries
CREATE INDEX idx_user_workout_status ON user_workout_session 
(user_id, session_status, scheduled_at DESC);

-- Permission resolution
CREATE INDEX idx_user_role_active ON user_role 
(user_id, is_active) WHERE is_active = true;

-- Measurement trending
CREATE INDEX idx_user_measurement_date ON user_measurement 
(user_id, metric_id, measurement_date DESC);
```

### **Caching Strategy**
- **L1 Cache**: User profile data during session
- **L2 Cache**: User permissions and roles (Redis)
- **L3 Cache**: User progress summaries and statistics

---

## 🔒 **Security & Privacy**

### **Data Protection**
- **Email encryption** at rest (PII data)
- **Password reset tokens** with expiration
- **Soft delete** preserves referential integrity
- **GDPR compliance** with data export/anonymization

### **Access Patterns**
```sql
-- Row-level security example
CREATE POLICY user_data_isolation ON user_setting
  FOR ALL TO application_role
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Audit sensitive operations
CREATE TRIGGER user_audit_trigger
  AFTER UPDATE ON user
  FOR EACH ROW EXECUTE FUNCTION audit_user_changes();
```

### **Permission Inheritance**
```sql
-- Role hierarchy with scope limitations
USER → USER_ROLE → ROLE → ROLE_PERMISSION → PERMISSION
     ↘ USER_PERMISSION (direct grants)
```

---

## 📈 **Analytics & Insights**

### **User Engagement Metrics**
```sql
-- Workout consistency tracking
SELECT 
  user_id,
  DATE_TRUNC('week', completed_at) as week,
  COUNT(*) as workouts_completed,
  AVG(effort_rating) as avg_effort
FROM user_workout_session 
WHERE session_status = 'COMPLETED'
GROUP BY user_id, week;

-- Progress measurement trends
SELECT 
  user_id,
  metric_id,
  measured_value,
  LAG(measured_value) OVER (
    PARTITION BY user_id, metric_id 
    ORDER BY measurement_date
  ) as previous_value
FROM user_measurement;
```

### **Common Query Patterns**
1. **Authentication**: `SELECT * FROM user WHERE email = ? AND is_active = true`
2. **Permission Check**: Join `user → user_role → role → role_permission → permission`
3. **Progress Dashboard**: Recent workout sessions + current measurements
4. **Setting Lookup**: User settings with fallback to system defaults

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- User authentication and profile management
- Permission resolution and inheritance
- Setting validation and type safety
- Progress calculation algorithms

### **Integration Tests**
- Cross-domain user interactions (favorites, ratings, activities)
- Permission enforcement across different scopes
- Progress tracking workflow (enrollment → sessions → completion)
- Multi-institutional user relationships

### **Performance Tests**
- Authentication latency under concurrent load
- Permission check performance with complex role hierarchies
- Progress query performance with large datasets
- Setting lookup performance across user base

---

## 🔄 **Common Workflows**

### **1. User Registration**
```sql
-- 1. Create user profile
INSERT INTO user (email, first_name, last_name, visibility_id);

-- 2. Set default settings
INSERT INTO user_setting (user_id, setting_id, value, is_default);

-- 3. Assign default role
INSERT INTO user_role (user_id, role_id, scope_type);

-- 4. Create initial activity record
INSERT INTO activity (user_id, activity_type_id, title);
```

### **2. Workout Session Flow**
```sql
-- 1. Plan session
INSERT INTO user_workout_session (user_id, workout_id, session_status = 'PLANNED');

-- 2. Start session  
UPDATE user_workout_session SET session_status = 'IN_PROGRESS', started_at = now();

-- 3. Track exercise performance
INSERT INTO user_exercise_performance (user_workout_session_id, exercise_instruction_id, ...);

-- 4. Complete session
UPDATE user_workout_session SET session_status = 'COMPLETED', completed_at = now();
```

### **3. Permission Resolution**
```sql
-- Check user permissions (with role inheritance)
WITH user_permissions AS (
  -- Direct permissions
  SELECT permission_id FROM user_permission 
  WHERE user_id = ? AND is_active = true
  
  UNION
  
  -- Role-based permissions
  SELECT rp.permission_id 
  FROM user_role ur
  JOIN role_permission rp ON ur.role_id = rp.role_id
  WHERE ur.user_id = ? AND ur.is_active = true
)
SELECT p.* FROM permission p
JOIN user_permissions up ON p.id = up.permission_id
WHERE p.actor = 'USER' AND p.resource = ? AND p.action = ?;
```

---

## 📋 **Seed Data Requirements**

### **Essential Data**
```sql
-- Default visibility settings
INSERT INTO visibility (name, resource_type) VALUES ('PRIVATE', 'USER');

-- Core user settings
INSERT INTO setting (setting_key, data_type, default_value) VALUES 
('user.theme', 'STRING', '"light"'),
('user.language', 'STRING', '"en"'),
('user.timezone', 'STRING', '"UTC"');

-- Basic user roles
INSERT INTO role (name, type) VALUES 
('USER', 'MEMBER'),
('PREMIUM_USER', 'MEMBER'),
('ADMIN', 'ADMIN');
```

---

## 🚨 **Monitoring & Alerts**

### **Critical Metrics**
- Authentication failure rate (>5% = alert)
- Permission check latency (>50ms = warning)
- Workout session completion rate
- User engagement trends (DAU/MAU)

### **Health Checks**
- User table query performance
- Permission resolution speed
- Setting lookup availability
- Progress data integrity

---

**Domain Owner**: User Experience Team  
**Last Updated**: December 2024  
**Implementation Status**: Core Complete, Advanced Features In Progress


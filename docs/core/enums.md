# Enums
**Section:** Core
**Subsection:** Enums

## Diagram
```mermaid
erDiagram
  %%========================
  %% 1) Core Lookup Tables
  %%========================
  TAG {
    UUID id PK                        "NOT NULL; UNIQUE"
    ENUM name                         "NOT NULL; UNIQUE; CHECK (name IN ('EXPRESS', 'SKILL', 'DYNAMIC', 'HARD', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPLOSIVE', 'STATIC', 'FUNCTIONAL'))"
    ENUM type                         "NOT NULL; CHECK (type IN ('SKILL_LEVEL', 'INTENSITY', 'MOVEMENT_TYPE', 'EXPERIENCE_LEVEL', 'TRAINING_STYLE'))"
    TEXT description                  "NULLABLE"
    BOOLEAN is_system_tag             "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  CATEGORY {
    UUID id PK                        "NOT NULL; UNIQUE"
    ENUM name                         "NOT NULL; UNIQUE; CHECK (name IN ('STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE', 'REHABILITATION', 'SPORTS_SPECIFIC', 'BODYWEIGHT', 'WEIGHTED', 'MACHINE', 'FREE_WEIGHT'))"
    ENUM type                         "NOT NULL; CHECK (type IN ('EXERCISE', 'PROGRAM', 'EQUIPMENT', 'WORKOUT', 'USER', 'INSTITUTION', 'TRAINING_STYLE', 'EQUIPMENT_TYPE'))"
    TEXT description                  "NULLABLE"
    UUID parent_category_id FK        "NULLABLE; references CATEGORY.id; CHECK (parent_category_id != id)"
    SMALLINT hierarchy_level          "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 5)"
    VARCHAR(500) hierarchy_path       "NOT NULL; materialized path for efficient queries"
    BOOLEAN is_system_category        "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  STATUS {
    UUID id PK                        "NOT NULL; UNIQUE"
    ENUM name                         "NOT NULL; UNIQUE; CHECK (name IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'COMPLETED', 'IN_PROGRESS'))"
    ENUM type                         "NOT NULL; CHECK (type IN ('PUBLISHING', 'APPROVAL', 'COMPLETION', 'WORKFLOW', 'SYSTEM_STATE'))"
    TEXT description                  "NULLABLE"
    VARCHAR(7) color_code             "NULLABLE; CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'); hex color for UI"
    BOOLEAN is_final_state            "NOT NULL; DEFAULT false"
    BOOLEAN is_system_status          "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  METRIC {
    UUID id PK                        "NOT NULL; UNIQUE"
    ENUM name                         "NOT NULL; UNIQUE; CHECK (name IN ('WEIGHT', 'REPETITIONS', 'DURATION', 'DISTANCE', 'HEART_RATE', 'CALORIES', 'POWER', 'SPEED', 'DIFFICULTY_SCORE', 'PROGRESSION_RATE'))"
    ENUM type                         "NOT NULL; CHECK (type IN ('MEASUREMENT', 'PROGRESSION', 'DIFFICULTY', 'PERFORMANCE', 'PHYSIOLOGICAL'))"
    TEXT description                  "NULLABLE"
    BOOLEAN is_system_metric          "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  VISIBILITY {
    UUID id PK                        "NOT NULL; UNIQUE"
    ENUM name                         "NOT NULL; UNIQUE; CHECK (name IN ('PRIVATE', 'SHARED', 'PUBLIC', 'INSTITUTION', 'DEPARTMENT', 'ROLE_BASED', 'INTERNAL', 'SYSTEM'))"
    ENUM resource_type                "NOT NULL; CHECK (resource_type IN ('EXERCISE', 'WORKOUT', 'PROGRAM', 'INSTITUTION', 'USER', 'ACTIVITY', 'MEDIA', 'EQUIPMENT', 'FAVORITE', 'RATING'))"
    TEXT description                  "NULLABLE; what this level of visibility means"
    BOOLEAN is_default                "NOT NULL; DEFAULT false"
    BOOLEAN requires_permission       "NOT NULL; DEFAULT false"
    BOOLEAN is_system_visibility      "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  %%====================================
  %% 2) STATUS Subclass: Log/Severity Pair
  %%====================================
  LOG_LEVEL_STATUS {
    UUID id PK                        "NOT NULL; UNIQUE"
    UUID log_level_status_id FK       "NOT NULL; references STATUS.id; CHECK (log_level_status.type = 'SYSTEM_STATE')"
    UUID severity_status_id FK        "NOT NULL; references STATUS.id; CHECK (severity_status.type = 'SEVERITY')"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
    UNIQUE(log_level_status_id, severity_status_id) "Business constraint: unique log/severity pairs"
  }
  
  %%================================================================
  %% 3) METRIC Subtypes (each "points back" to METRIC.id as a child)
  %%================================================================
  MEASUREMENT_UNIT {
    UUID id PK                        "NOT NULL; UNIQUE"
    UUID metric_id FK                 "NOT NULL; references METRIC.id; CHECK (metric.type = 'MEASUREMENT')"
    ENUM unit_name                    "NOT NULL; CHECK (unit_name IN ('KILOGRAM', 'POUND', 'CENTIMETER', 'INCH', 'SECOND', 'MINUTE', 'METER', 'KILOMETER', 'MILE'))"
    ENUM unit_symbol                  "NOT NULL; CHECK (unit_symbol IN ('kg', 'lb', 'cm', 'in', 's', 'min', 'm', 'km', 'mi'))"
    ENUM unit_type                    "NOT NULL; CHECK (unit_type IN ('WEIGHT', 'LENGTH', 'TIME', 'COUNT', 'PERCENTAGE'))"
    DECIMAL conversion_factor         "NOT NULL; DEFAULT 1.0; CHECK (conversion_factor > 0); to base unit"
    BOOLEAN is_base_unit              "NOT NULL; DEFAULT false"
    BOOLEAN is_metric_system          "NOT NULL; DEFAULT true"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  PROGRESSION_METRIC {
    UUID id PK                        "NOT NULL; UNIQUE"
    UUID metric_id FK                 "NOT NULL; references METRIC.id; CHECK (metric.type = 'PROGRESSION')"
    VARCHAR(50) progression_name      "NOT NULL"
    TEXT calculation_formula          "NULLABLE; how progression is calculated"
    ENUM progression_direction        "NOT NULL; CHECK (progression_direction IN ('INCREASE', 'DECREASE', 'MAINTAIN'))"
    DECIMAL target_increment          "NULLABLE; CHECK (target_increment > 0); suggested increment per session"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  DIFFICULTY_LEVEL {
    UUID id PK                        "NOT NULL; UNIQUE"
    UUID metric_id FK                 "NOT NULL; references METRIC.id; CHECK (metric.type = 'DIFFICULTY')"
    ENUM level_name                   "NOT NULL; CHECK (level_name IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'PROFESSIONAL'))"
    SMALLINT level_value              "NOT NULL; CHECK (level_value >= 1 AND level_value <= 10)"
    TEXT level_description            "NULLABLE"
    VARCHAR(7) color_code             "NULLABLE; CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'); hex color for UI"
    UUID created_by_user_id FK        "NOT NULL; references USER.id"
    UUID updated_by_user_id FK        "NULLABLE; references USER.id"
    TIMESTAMP created_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at              "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                 "NOT NULL; DEFAULT true"
  }
  
  %%============================
  %% 4) Relationships Declaration
  %%============================
  %%— METRIC → its subtypes
  METRIC ||--o{ MEASUREMENT_UNIT      : "has units"
  METRIC ||--o{ PROGRESSION_METRIC    : "tracks progression"
  METRIC ||--o{ DIFFICULTY_LEVEL      : "defines difficulty"
  
  %%— LOG_LEVEL_STATUS → STATUS (two roles) - FIXED naming
  LOG_LEVEL_STATUS }|--|| STATUS      : "log_level_status"
  LOG_LEVEL_STATUS }|--|| STATUS      : "severity_status"
  
  %%— Category hierarchy - FIXED with circular prevention
  CATEGORY ||--o{ CATEGORY            : "parent_of"
  
  %%— User audit trails - FIXED naming
  TAG }|--|| USER                     : "created_by_user"
  TAG }o--|| USER                     : "updated_by_user"
  CATEGORY }|--|| USER                : "created_by_user"
  CATEGORY }o--|| USER                : "updated_by_user"
  STATUS }|--|| USER                  : "created_by_user"
  STATUS }o--|| USER                  : "updated_by_user"
  METRIC }|--|| USER                  : "created_by_user"
  METRIC }o--|| USER                  : "updated_by_user"
  VISIBILITY }|--|| USER              : "created_by_user"
  VISIBILITY }o--|| USER              : "updated_by_user"
  LOG_LEVEL_STATUS }|--|| USER        : "created_by_user"
  LOG_LEVEL_STATUS }o--|| USER        : "updated_by_user"
  MEASUREMENT_UNIT }|--|| USER        : "created_by_user"
  MEASUREMENT_UNIT }o--|| USER        : "updated_by_user"
  PROGRESSION_METRIC }|--|| USER      : "created_by_user"
  PROGRESSION_METRIC }o--|| USER      : "updated_by_user"
  DIFFICULTY_LEVEL }|--|| USER        : "created_by_user"
  DIFFICULTY_LEVEL }o--|| USER        : "updated_by_user"
```

## Notes
This diagram represents the enums structure and relationships with proper audit trails and hierarchical organization within the core domain.

---
*Generated from diagram extraction script*
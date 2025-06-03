# Exercise Domain Documentation

> **Comprehensive exercise library with variants, media, and targeting information**

## 📋 **Domain Overview**

The Exercise domain manages the complete exercise catalog:
- **Exercise Library** - Definitions, instructions, difficulty levels
- **Variants & Accessibility** - Exercise modifications and alternatives
- **Media & Equipment** - Instructional content and required equipment
- **Muscle Targeting** - Detailed anatomy and muscle activation data

---

## 📁 **Files in this Domain**

| File | Purpose | Key Tables | Implementation Phase |
|------|---------|------------|---------------------|
| [`core.md`](./core.md) | Exercise definitions and classification | `EXERCISE`, `EXERCISE_CATEGORY`, `EXERCISE_TAG` | Phase 1 - MVP |
| [`variants.md`](./variants.md) | Exercise alternatives and accessibility | `EXERCISE_VARIANT`, `EXERCISE_ACCESSIBILITY` | Phase 2 - Core |
| [`extensions.md`](./extensions.md) | Media, equipment, and muscle targeting | `EXERCISE_MEDIA`, `EXERCISE_EQUIPMENT`, `EXERCISE_MUSCLE_TARGET` | Phase 2 - Core |

---

## 🎯 **Implementation Priority**

### **Phase 1 - Core Library**
```sql
-- Essential exercise catalog
1. core.md          -- Basic exercise definitions
```

### **Phase 2 - Rich Content**
```sql
-- Enhanced exercise data
2. variants.md      -- Modifications and alternatives  
3. extensions.md    -- Media, equipment, muscle targeting
```

---

## 🔗 **Domain Dependencies**

### **Dependencies (Exercise depends on)**
- **core/** - `DIFFICULTY_LEVEL`, `VISIBILITY`, `TAG`, `CATEGORY`, `MUSCLE`
- **media/** - `MEDIA` (for instructional content)
- **equipment/** - `EQUIPMENT` (for required/optional equipment)

### **Dependents (Domains that depend on Exercise)**
- **workout/** - `EXERCISE_INSTRUCTION` references `EXERCISE`
- **user/** - `USER_EXERCISE_PERFORMANCE` tracks exercise execution
- **activity/** - Exercise-related activities
- **favorite/** - Users can favorite exercises
- **rating/** - Users can rate exercises

---

## 🏗️ **Key Architecture Patterns**

### **1. Rich Content Model**
```sql
-- Comprehensive exercise definition
EXERCISE {
  name VARCHAR(100),           -- Clear, searchable name
  description VARCHAR(500),    -- Brief overview  
  instructions TEXT,           -- Detailed step-by-step
  notes TEXT,                 -- Additional tips/warnings
  difficulty_level_id FK       -- Standardized difficulty
}
```

### **2. Flexible Variant System**
```sql
-- Difficulty progressions and regressions
EXERCISE_VARIANT {
  exercise_id FK,
  variant_exercise_id FK,
  difficulty_delta SMALLINT,  -- -5 to +5 relative difficulty
  order_index SMALLINT       -- Suggested progression order
}
```

### **3. Accessibility-First Design**
```sql
-- Inclusive exercise alternatives
EXERCISE_ACCESSIBILITY {
  exercise_id FK,
  alternative_exercise_id FK,
  accessibility_type ENUM,    -- 'MOBILITY_LIMITED', 'EQUIPMENT_FREE', etc.
  accessibility_note TEXT     -- Specific guidance
}
```

### **4. Detailed Muscle Targeting**
```sql
-- Precise muscle activation mapping
EXERCISE_MUSCLE_TARGET {
  exercise_id FK,
  muscle_id FK,
  target_type ENUM,           -- 'PRIMARY', 'SECONDARY', 'STABILIZER'
  intensity_percentage SMALLINT  -- 1-100 activation level
}
```

---

## 📊 **Performance Considerations**

### **Search Performance**
```sql
-- Full-text search across exercise content
CREATE INDEX idx_exercise_fts ON exercise 
USING gin(to_tsvector('english', name || ' ' || description || ' ' || instructions));

-- Category and tag filtering
CREATE INDEX idx_exercise_category ON exercise_category (category_id, is_primary);
CREATE INDEX idx_exercise_tag ON exercise_tag (tag_id);

-- Muscle targeting queries
CREATE INDEX idx_exercise_muscle_target ON exercise_muscle_target 
(muscle_id, target_type, intensity_percentage DESC);
```

### **Content Loading Optimization**
```sql
-- Media loading for exercise details
CREATE INDEX idx_exercise_media_purpose ON exercise_media 
(exercise_id, media_purpose, display_order);

-- Equipment requirement lookups
CREATE INDEX idx_exercise_equipment_req ON exercise_equipment 
(exercise_id, is_required);
```

### **Caching Strategy**
- **L1 Cache**: Popular exercises and their basic info
- **L2 Cache**: Exercise search results and filtered lists  
- **L3 Cache**: Complete exercise details with media/equipment
- **CDN Cache**: Exercise media files (images, videos)

---

## 🔍 **Search & Discovery**

### **Multi-Dimensional Search**
```sql
-- Complex exercise filtering
SELECT e.* FROM exercise e
JOIN exercise_category ec ON e.id = ec.exercise_id
JOIN exercise_muscle_target emt ON e.id = emt.exercise_id  
JOIN exercise_equipment eeq ON e.id = eeq.exercise_id
WHERE 
  ec.category_id = ?                    -- Category filter
  AND emt.muscle_id = ?                -- Muscle target
  AND emt.target_type = 'PRIMARY'      -- Primary muscle only
  AND (eeq.equipment_id = ? OR eeq.is_required = false)  -- Equipment availability
  AND e.difficulty_level_id <= ?       -- Max difficulty
  AND e.is_active = true;
```

### **Recommendation Patterns**
1. **Similar Exercises**: Same muscle groups, similar difficulty
2. **Progressive Variants**: Difficulty progression chains
3. **Equipment Alternatives**: Same movement, different equipment
4. **Accessibility Options**: Alternative exercises for limitations

---

## 🎨 **Content Management**

### **Exercise Creation Workflow**
```sql
-- 1. Create base exercise
INSERT INTO exercise (name, description, instructions, difficulty_level_id);

-- 2. Add muscle targeting
INSERT INTO exercise_muscle_target (exercise_id, muscle_id, target_type, intensity_percentage);

-- 3. Associate equipment
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required);

-- 4. Add media content
INSERT INTO exercise_media (exercise_id, media_id, media_purpose, display_order);

-- 5. Create variants/alternatives
INSERT INTO exercise_variant (exercise_id, variant_exercise_id, difficulty_delta);
INSERT INTO exercise_accessibility (exercise_id, alternative_exercise_id, accessibility_type);
```

### **Content Validation**
- **Name uniqueness** within active exercises
- **Instruction completeness** (minimum length requirements)
- **Media quality** (resolution, format validation)
- **Muscle targeting accuracy** (anatomical validation)

---

## 🧪 **Testing Strategy**

### **Content Quality Tests**
- Exercise instruction clarity and completeness
- Media file accessibility and loading
- Muscle targeting anatomical accuracy
- Equipment requirement validation

### **Search Performance Tests**
- Full-text search response time (<100ms)
- Complex filter query performance
- Recommendation algorithm accuracy
- Mobile app content loading speed

### **Integration Tests**
- Exercise → Workout integration
- User progress tracking across exercises
- Favorite/rating system integration
- Multi-language content delivery

---

## 📈 **Analytics & Insights**

### **Popular Exercise Tracking**
```sql
-- Most frequently used exercises
SELECT 
  e.name,
  COUNT(uep.id) as usage_count,
  AVG(uep.difficulty_rating) as avg_perceived_difficulty
FROM exercise e
JOIN exercise_instruction ei ON e.id = ei.exercise_id
JOIN user_exercise_performance uep ON ei.id = uep.exercise_instruction_id
GROUP BY e.id, e.name
ORDER BY usage_count DESC;
```

### **Effectiveness Metrics**
```sql
-- Exercise rating vs usage correlation
SELECT 
  e.name,
  AVG(r.rating_value) as avg_rating,
  COUNT(uep.id) as usage_count,
  AVG(uep.difficulty_rating) as perceived_difficulty
FROM exercise e
LEFT JOIN rating r ON e.id = r.resource_id AND r.resource_type = 'EXERCISE'
LEFT JOIN exercise_instruction ei ON e.id = ei.exercise_id
LEFT JOIN user_exercise_performance uep ON ei.id = uep.exercise_instruction_id
GROUP BY e.id, e.name;
```

---

## 🔄 **Common Query Patterns**

### **1. Exercise Library Browse**
```sql
-- Browse by category with pagination
SELECT e.*, dl.level_name, array_agg(DISTINCT c.name) as categories
FROM exercise e
JOIN difficulty_level dl ON e.difficulty_level_id = dl.id
JOIN exercise_category ec ON e.id = ec.exercise_id
JOIN category c ON ec.category_id = c.id
WHERE e.is_active = true
GROUP BY e.id, dl.level_name
ORDER BY e.name
LIMIT 20 OFFSET ?;
```

### **2. Exercise Detail View**
```sql
-- Complete exercise information
SELECT 
  e.*,
  json_agg(DISTINCT jsonb_build_object(
    'muscle_name', m.name,
    'target_type', emt.target_type,
    'intensity', emt.intensity_percentage
  )) as muscle_targets,
  json_agg(DISTINCT jsonb_build_object(
    'equipment_name', eq.name,
    'is_required', eeq.is_required
  )) as equipment
FROM exercise e
LEFT JOIN exercise_muscle_target emt ON e.id = emt.exercise_id
LEFT JOIN muscle m ON emt.muscle_id = m.id
LEFT JOIN exercise_equipment eeq ON e.id = eeq.exercise_id  
LEFT JOIN equipment eq ON eeq.equipment_id = eq.id
WHERE e.id = ?
GROUP BY e.id;
```

### **3. Exercise Variants Discovery**
```sql
-- Find easier/harder variants
SELECT 
  e.name as original_exercise,
  ve.name as variant_exercise,
  ev.difficulty_delta,
  ev.order_index
FROM exercise e
JOIN exercise_variant ev ON e.id = ev.exercise_id
JOIN exercise ve ON ev.variant_exercise_id = ve.id
WHERE e.id = ?
ORDER BY ev.difficulty_delta, ev.order_index;
```

---

## 📋 **Seed Data Requirements**

### **Essential Exercise Data**
```sql
-- Core difficulty levels
INSERT INTO difficulty_level (level_name, level_value) VALUES 
('BEGINNER', 1), ('INTERMEDIATE', 5), ('ADVANCED', 8), ('EXPERT', 10);

-- Basic exercise categories  
INSERT INTO category (name, type) VALUES
('STRENGTH', 'EXERCISE'), ('CARDIO', 'EXERCISE'), 
('FLEXIBILITY', 'EXERCISE'), ('BALANCE', 'EXERCISE');

-- Common exercise tags
INSERT INTO tag (name, type) VALUES
('BODYWEIGHT', 'TRAINING_STYLE'), ('WEIGHTED', 'TRAINING_STYLE'),
('COMPOUND', 'MOVEMENT_TYPE'), ('ISOLATION', 'MOVEMENT_TYPE');
```

### **Sample Exercises**
```sql
-- Popular fundamental exercises
INSERT INTO exercise (name, description, instructions, difficulty_level_id) VALUES
('Push-up', 'Classic bodyweight chest exercise', 'Detailed step-by-step...', 1),
('Squat', 'Fundamental lower body movement', 'Detailed step-by-step...', 1),
('Pull-up', 'Upper body pulling exercise', 'Detailed step-by-step...', 5);
```

---

## 🚨 **Monitoring & Quality Assurance**

### **Content Health Metrics**
- Exercise completion rate (sessions started vs completed)
- User difficulty rating vs system difficulty
- Media loading success rate
- Search result relevance scores

### **Quality Indicators**
- Exercises with missing media (<90% = alert)
- Exercises with no muscle targeting data
- Instructions below minimum length threshold  
- Equipment associations without proper media

---

**Domain Owner**: Content & Exercise Team  
**Last Updated**: December 2024  
**Implementation Status**: Core Complete, Rich Content In Progress


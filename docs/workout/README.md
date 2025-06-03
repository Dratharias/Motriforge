# Workout Domain Documentation

> **Structured workout composition system with sets, exercises, and comprehensive tracking**

## 📋 **Domain Overview**

The Workout domain manages structured fitness routines:
- **Workout Composition** - Sets, exercises, instructions, and tempo
- **Muscle Targeting** - Comprehensive muscle group planning
- **Timing & Structure** - Rest periods, order, and flow optimization
- **Versioning & Media** - Content management and instructional materials

---

## 📁 **Files in this Domain**

| File | Purpose | Key Tables | Implementation Phase |
|------|---------|------------|---------------------|
| [`core.md`](./core.md) | Workout definitions and metadata | `WORKOUT`, `WORKOUT_CATEGORY`, `WORKOUT_TAG`, `WORKOUT_GOAL` | Phase 1 - MVP |
| [`composition.md`](./composition.md) | Sets, exercises, instructions, tempo | `WORKOUT_SET`, `EXERCISE_INSTRUCTION`, `TEMPO`, `WORKOUT_MUSCLE_TARGET` | Phase 1 - MVP |
| [`extensions.md`](./extensions.md) | Versions, media, duration analytics | `WORKOUT_VERSION`, `WORKOUT_MEDIA`, `WORKOUT_DURATION_BREAKDOWN` | Phase 2 - Core |

---

## 🎯 **Implementation Priority**

### **Phase 1 - Core Workout System**
```sql
-- Essential workout functionality
1. core.md         -- Workout definitions and classification
2. composition.md  -- Sets, exercises, and structure
```

### **Phase 2 - Enhanced Features**
```sql
-- Advanced workout management
3. extensions.md   -- Versioning, media, analytics
```

---

## 🔗 **Domain Dependencies**

### **Dependencies (Workout depends on)**
- **core/** - `DIFFICULTY_LEVEL`, `STATUS`, `VISIBILITY`, `TAG`, `CATEGORY`, `MUSCLE`
- **exercise/** - `EXERCISE` (for workout composition)
- **goals/** - `GOAL` (for workout objectives)
- **media/** - `MEDIA` (for instructional content)

### **Dependents (Domains that depend on Workout)**
- **user/** - `USER_WORKOUT_SESSION` tracks workout execution
- **program/** - `SCHEDULE_WORKOUT` includes workouts in programs
- **activity/** - Workout-related user activities
- **favorite/** - Users can favorite workouts
- **rating/** - Users can rate workouts

---

## 🏗️ **Key Architecture Patterns**

### **1. Hierarchical Workout Structure**
```sql
-- Three-level hierarchy: Workout → Set → Exercise
WORKOUT (metadata, goals, targeting)
  ↓
WORKOUT_SET (muscle focus, rest periods)
  ↓  
EXERCISE_INSTRUCTION (reps, weight, tempo)
```

### **2. Comprehensive Muscle Targeting**
```sql
-- Workout-level muscle targeting overview
WORKOUT_MUSCLE_TARGET {
  target_type ENUM,           -- 'PRIMARY', 'SECONDARY', 'STABILIZER'
  intensity_percentage SMALLINT  -- Expected muscle activation 1-100
}

-- Set-level muscle focus
WORKOUT_SET {
  target_muscle_id FK,        -- Primary muscle for this set
  rest_after_seconds SMALLINT -- Recovery time
}
```

### **3. Detailed Exercise Instructions**
```sql
-- Exercise-specific parameters within workout context
EXERCISE_INSTRUCTION {
  sets_count SMALLINT,        -- Number of sets
  reps_count SMALLINT,        -- Target repetitions
  weight_kg DECIMAL,          -- Suggested weight
  duration_seconds SMALLINT,  -- For time-based exercises
  custom_instructions TEXT    -- Workout-specific modifications
}
```

### **4. Advanced Tempo Control**
```sql
-- Precise movement timing control
TEMPO {
  tempo_type_id FK,           -- 'CONCENTRIC', 'ECCENTRIC', 'PAUSE'
  order_index SMALLINT,       -- Sequence within exercise
  custom_duration_seconds SMALLINT  -- Override default timing
}
```

---

## 📊 **Performance Considerations**

### **Complex Query Optimization**
```sql
-- Workout detail loading (most common query)
CREATE INDEX idx_workout_set_order ON workout_set (workout_id, order_index);
CREATE INDEX idx_instruction_order ON exercise_instruction (workout_set_id, order_index);
CREATE INDEX idx_tempo_order ON tempo (exercise_instruction_id, order_index);

-- Muscle targeting lookups
CREATE INDEX idx_workout_muscle_target ON workout_muscle_target 
(workout_id, target_type, intensity_percentage DESC);

-- Duration and timing queries
CREATE INDEX idx_workout_duration ON workout (estimated_duration_seconds, difficulty_level_id);
```

### **Workout Loading Strategy**
```sql
-- Optimized single-query workout loading
WITH workout_details AS (
  SELECT 
    w.*,
    json_agg(DISTINCT jsonb_build_object(
      'set_id', ws.id,
      'set_name', ws.name,
      'order_index', ws.order_index,
      'exercises', (
        SELECT json_agg(jsonb_build_object(
          'exercise_id', ei.exercise_id,
          'exercise_name', e.name,
          'sets_count', ei.sets_count,
          'reps_count', ei.reps_count
        ) ORDER BY ei.order_index)
        FROM exercise_instruction ei
        JOIN exercise e ON ei.exercise_id = e.id
        WHERE ei.workout_set_id = ws.id
      )
    ) ORDER BY ws.order_index) as sets
  FROM workout w
  JOIN workout_set ws ON w.id = ws.workout_id
  WHERE w.id = ?
  GROUP BY w.id
)
SELECT * FROM workout_details;
```

### **Caching Strategy**
- **L1 Cache**: Popular workout structures and metadata
- **L2 Cache**: Complete workout details with exercises
- **L3 Cache**: Workout search results and filtered lists
- **Precomputed**: Duration breakdowns and muscle targeting summaries

---

## 🎯 **Workout Composition Patterns**

### **1. Strength Training Structure**
```sql
-- Example: Upper body strength workout
WORKOUT: "Upper Body Strength"
├── SET 1: "Chest Compound" (target: Pectorals)
│   ├── Push-ups: 3 sets × 12 reps
│   └── Rest: 90 seconds
├── SET 2: "Back Compound" (target: Latissimus Dorsi)  
│   ├── Pull-ups: 3 sets × 8 reps
│   └── Rest: 90 seconds
└── SET 3: "Arms Isolation" (target: Biceps)
    ├── Bicep Curls: 2 sets × 15 reps
    └── Rest: 60 seconds
```

### **2. Circuit Training Structure**
```sql
-- Example: HIIT circuit workout
WORKOUT: "HIIT Circuit"
├── SET 1: "Circuit Round 1" (target: Full Body)
│   ├── Burpees: 45 seconds work / 15 seconds rest
│   ├── Mountain Climbers: 45 seconds work / 15 seconds rest
│   └── Jump Squats: 45 seconds work / 15 seconds rest
└── Rest between rounds: 120 seconds
```

### **3. Flexibility/Mobility Structure**
```sql
-- Example: Morning mobility routine
WORKOUT: "Morning Mobility"
├── SET 1: "Dynamic Warm-up" (target: Full Body)
│   ├── Arm Circles: 30 seconds each direction
│   └── Leg Swings: 20 reps each leg
└── SET 2: "Static Stretching" (target: Flexibility)
    ├── Hamstring Stretch: Hold 30 seconds
    └── Shoulder Stretch: Hold 30 seconds
```

---

## 🧪 **Testing Strategy**

### **Workout Integrity Tests**
- Set order validation (no gaps in order_index)
- Exercise instruction completeness
- Rest period reasonableness (not negative, not excessive)
- Muscle targeting consistency

### **Performance Tests**
- Workout detail loading speed (<200ms)
- Complex workout search performance
- Bulk workout operations (import/export)
- Concurrent workout session tracking

### **Business Logic Tests**
- Duration calculation accuracy
- Muscle targeting summation
- Exercise substitution logic
- Workout difficulty assessment

---

## 📈 **Analytics & Insights**

### **Workout Effectiveness Metrics**
```sql
-- Completion rate by workout difficulty
SELECT 
  dl.level_name,
  COUNT(uws.id) as total_sessions,
  COUNT(CASE WHEN uws.session_status = 'COMPLETED' THEN 1 END) as completed_sessions,
  ROUND(COUNT(CASE WHEN uws.session_status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(uws.id), 2) as completion_rate
FROM workout w
JOIN difficulty_level dl ON w.difficulty_level_id = dl.id
LEFT JOIN user_workout_session uws ON w.id = uws.workout_id
GROUP BY dl.level_name, dl.level_value
ORDER BY dl.level_value;
```

### **Popular Exercise Combinations**
```sql
-- Most common exercise pairs within workouts
SELECT 
  e1.name as first_exercise,
  e2.name as second_exercise,
  COUNT(*) as combination_count
FROM exercise_instruction ei1
JOIN exercise_instruction ei2 ON ei1.workout_set_id = ei2.workout_set_id
JOIN exercise e1 ON ei1.exercise_id = e1.id
JOIN exercise e2 ON ei2.exercise_id = e2.id
WHERE ei1.order_index < ei2.order_index
GROUP BY e1.name, e2.name
ORDER BY combination_count DESC
LIMIT 20;
```

---

## 🔄 **Common Workflows**

### **1. Workout Creation**
```sql
-- 1. Create workout metadata
INSERT INTO workout (name, estimated_duration_seconds, difficulty_level_id);

-- 2. Add muscle targeting
INSERT INTO workout_muscle_target (workout_id, muscle_id, target_type, intensity_percentage);

-- 3. Create sets with exercises
INSERT INTO workout_set (workout_id, name, target_muscle_id, order_index);
INSERT INTO exercise_instruction (workout_set_id, exercise_id, sets_count, reps_count, order_index);

-- 4. Add tempo specifications (optional)
INSERT INTO tempo (exercise_instruction_id, tempo_type_id, order_index, custom_duration_seconds);

-- 5. Calculate and store duration breakdown
INSERT INTO workout_duration_breakdown (workout_id, total_seconds, exercise_seconds, rest_seconds);
```

### **2. Workout Execution Tracking**
```sql
-- Track user workout session with detailed performance
INSERT INTO user_workout_session (user_id, workout_id, session_status = 'PLANNED');

-- Update as user progresses through workout
UPDATE user_workout_session SET session_status = 'IN_PROGRESS', started_at = now();

-- Track performance for each exercise
INSERT INTO user_exercise_performance (
  user_workout_session_id, 
  exercise_instruction_id, 
  sets_completed, 
  reps_completed, 
  weight_used_kg
);

-- Complete workout session
UPDATE user_workout_session SET 
  session_status = 'COMPLETED',
  completed_at = now(),
  actual_duration_seconds = ?,
  effort_rating = ?,
  soreness_rating = ?;
```

### **3. Workout Modification**
```sql
-- Version tracking for workout changes
INSERT INTO workout_version (workout_id, version_number, change_reason);

-- Update workout structure
UPDATE exercise_instruction SET reps_count = ? WHERE id = ?;

-- Recalculate duration breakdown
UPDATE workout_duration_breakdown SET 
  total_seconds = ?,
  exercise_seconds = ?,
  rest_seconds = ?
WHERE workout_id = ?;
```

---

## 📋 **Seed Data Requirements**

### **Tempo Types**
```sql
INSERT INTO tempo_type (name, time_under_tension_seconds, description) VALUES
('CONCENTRIC', 2, 'Muscle shortening phase'),
('ECCENTRIC', 3, 'Muscle lengthening phase'),
('ISOMETRIC', 1, 'Static hold phase'),
('PAUSE', 1, 'Rest between movement phases'),
('EXPLOSIVE', 1, 'Maximum speed movement');
```

### **Sample Workouts**
```sql
-- Basic bodyweight workout
INSERT INTO workout (name, estimated_duration_seconds, difficulty_level_id) VALUES
('Beginner Bodyweight Workout', 1800, 1); -- 30 minutes, beginner

-- Sample workout sets and exercises
INSERT INTO workout_set (workout_id, name, target_muscle_id, order_index) VALUES
(1, 'Upper Body', (SELECT id FROM muscle WHERE name = 'Pectoralis Major'), 1),
(1, 'Lower Body', (SELECT id FROM muscle WHERE name = 'Quadriceps'), 2);
```

---

## 🚨 **Monitoring & Quality Assurance**

### **Workout Health Metrics**
- Average workout completion rate (target: >80%)
- Duration accuracy (actual vs estimated within 15%)
- User effort ratings vs workout difficulty correlation
- Exercise instruction clarity ratings

### **Performance Indicators**
- Workout loading time (<200ms for detailed view)
- Search response time (<100ms)
- Concurrent workout session support
- Database query optimization effectiveness

---

**Domain Owner**: Workout Content Team  
**Last Updated**: December 2024  
**Implementation Status**: Core Complete, Advanced Features In Development


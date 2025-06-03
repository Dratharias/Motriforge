# Program Domain Documentation

> **Comprehensive training program system with scheduling, phases, and progression tracking**

## 📋 **Domain Overview**

The Program domain manages structured fitness programs:
- **Program Definition** - Multi-week training programs with objectives
- **Scheduling System** - Day-by-day workout planning and sequencing
- **Phase Management** - Training phases with progressive overload
- **Program Tracking** - User enrollment and progress monitoring

---

## 📁 **Files in this Domain**

| File | Purpose | Key Tables | Implementation Phase |
|------|---------|------------|---------------------|
| [`core.md`](./core.md) | Program definitions and classification | `PROGRAM`, `PROGRAM_CATEGORY`, `PROGRAM_TAG`, `PROGRAM_GOAL` | Phase 1 - MVP |
| [`schedule.md`](./schedule.md) | Workout scheduling and phases | `PROGRAM_SCHEDULE`, `SCHEDULE_WORKOUT`, `PROGRAM_PHASE` | Phase 2 - Core |
| [`extensions.md`](./extensions.md) | Versions and media management | `PROGRAM_VERSION`, `PROGRAM_MEDIA` | Phase 2 - Core |

---

## 🎯 **Implementation Priority**

### **Phase 1 - Program Foundation**
```sql
-- Basic program catalog
1. core.md         -- Program definitions and metadata
```

### **Phase 2 - Program Structure**
```sql
-- Advanced program features
2. schedule.md     -- Workout scheduling and phases
3. extensions.md   -- Content management
```

---

## 🔗 **Domain Dependencies**

### **Dependencies (Program depends on)**
- **core/** - `DIFFICULTY_LEVEL`, `STATUS`, `VISIBILITY`, `TAG`, `CATEGORY`
- **workout/** - `WORKOUT` (for scheduled workouts)
- **goals/** - `GOAL` (for program objectives)
- **media/** - `MEDIA` (for program materials)

### **Dependents (Domains that depend on Program)**
- **user/** - `USER_PROGRAM_ENROLLMENT` tracks user participation
- **activity/** - Program-related user activities
- **favorite/** - Users can favorite programs
- **rating/** - Users can rate programs

---

## 🏗️ **Key Architecture Patterns**

### **1. Multi-Level Program Structure**
```sql
-- Four-level hierarchy: Program → Schedule → Phase → Workout
PROGRAM (overview, duration, goals)
  ↓
PROGRAM_SCHEDULE (day-by-day plan)
  ↓
PROGRAM_PHASE (training phases within program)
  ↓
SCHEDULE_WORKOUT (specific workouts on specific days)
```

### **2. Flexible Scheduling System**
```sql
-- Day-based workout scheduling
PROGRAM_SCHEDULE {
  schedule_length_days SMALLINT,     -- Total program duration
  rest_days_per_week SMALLINT       -- Built-in recovery
}

SCHEDULE_WORKOUT {
  day_number SMALLINT,              -- Day 1, 2, 3... of program
  order_index SMALLINT,             -- Multiple workouts per day
  is_optional BOOLEAN               -- Required vs optional sessions
}
```

### **3. Progressive Phase Management**
```sql
-- Training phases with clear progression
PROGRAM_PHASE {
  phase_name VARCHAR(100),          -- "Base Building", "Intensity", "Peak"
  start_day SMALLINT,               -- Phase start day
  end_day SMALLINT,                 -- Phase end day
  order_index SMALLINT              -- Phase sequence
}
```

### **4. Goal-Oriented Design**
```sql
-- Programs linked to specific fitness goals
PROGRAM_GOAL {
  program_id FK,
  goal_id FK                        -- Weight loss, strength, endurance, etc.
}
```

---

## 📊 **Performance Considerations**

### **Program Loading Optimization**
```sql
-- Program schedule loading
CREATE INDEX idx_program_schedule ON program_schedule (program_id, is_active);
CREATE INDEX idx_schedule_workout_day ON schedule_workout 
(program_schedule_id, day_number, order_index);

-- Phase-based queries
CREATE INDEX idx_program_phase_order ON program_phase 
(program_id, order_index);
CREATE INDEX idx_program_phase_days ON program_phase 
(program_id, start_day, end_day);

-- User enrollment tracking
CREATE INDEX idx_user_program_status ON user_program_enrollment 
(user_id, enrollment_status, start_date DESC);
```

### **Complex Program Queries**
```sql
-- Load complete program with schedule
WITH program_schedule AS (
  SELECT 
    p.*,
    ps.schedule_length_days,
    json_agg(DISTINCT jsonb_build_object(
      'day_number', sw.day_number,
      'workout_id', sw.workout_id,
      'workout_name', w.name,
      'is_optional', sw.is_optional
    ) ORDER BY sw.day_number, sw.order_index) as daily_schedule
  FROM program p
  JOIN program_schedule ps ON p.id = ps.program_id
  JOIN schedule_workout sw ON ps.id = sw.program_schedule_id
  JOIN workout w ON sw.workout_id = w.id
  WHERE p.id = ?
  GROUP BY p.id, ps.schedule_length_days
)
SELECT * FROM program_schedule;
```

### **Caching Strategy**
- **L1 Cache**: Popular program metadata and schedules
- **L2 Cache**: Complete program details with workout plans
- **L3 Cache**: Program search results and recommendations
- **Precomputed**: Program difficulty assessments and duration estimates

---

## 🎯 **Program Design Patterns**

### **1. Linear Progression Programs**
```sql
-- Example: 12-week strength building program
PROGRAM: "12-Week Strength Builder" (duration: 84 days)
├── PHASE 1: "Foundation" (Days 1-28)
│   ├── Focus: Movement patterns and base strength
│   └── Workouts: 3x/week, moderate intensity
├── PHASE 2: "Development" (Days 29-56)  
│   ├── Focus: Progressive overload
│   └── Workouts: 4x/week, increased intensity
└── PHASE 3: "Peak" (Days 57-84)
    ├── Focus: Maximum strength
    └── Workouts: 5x/week, high intensity
```

### **2. Cyclical Training Programs**
```sql
-- Example: 4-week repeating cycle
PROGRAM: "4-Week Conditioning Cycle"
├── Week 1: High Volume, Low Intensity
├── Week 2: Medium Volume, Medium Intensity
├── Week 3: Low Volume, High Intensity
└── Week 4: Recovery Week (Deload)
-- Cycle repeats for program duration
```

### **3. Goal-Specific Programs**
```sql
-- Example: Weight loss program
PROGRAM: "8-Week Fat Loss Program"
├── PRIMARY GOAL: Weight Loss
├── SECONDARY GOAL: Muscle Retention
├── SCHEDULE: 6 days/week
│   ├── 4 days: Strength Training
│   ├── 2 days: Cardio Focus
│   └── 1 day: Rest
└── PROGRESSION: Increasing workout density over time
```

---

## 📈 **Program Analytics**

### **Completion Rate Analysis**
```sql
-- Program completion rates by difficulty and duration
SELECT 
  dl.level_name,
  p.duration_weeks,
  COUNT(upe.id) as total_enrollments,
  COUNT(CASE WHEN upe.enrollment_status = 'COMPLETED' THEN 1 END) as completions,
  ROUND(
    COUNT(CASE WHEN upe.enrollment_status = 'COMPLETED' THEN 1 END) * 100.0 / 
    COUNT(upe.id), 2
  ) as completion_rate
FROM program p
JOIN difficulty_level dl ON p.difficulty_level_id = dl.id
LEFT JOIN user_program_enrollment upe ON p.id = upe.program_id
GROUP BY dl.level_name, p.duration_weeks
ORDER BY dl.level_value, p.duration_weeks;
```

### **User Progress Tracking**
```sql
-- User progress through program phases
SELECT 
  upe.user_id,
  p.title as program_name,
  upe.current_day,
  pp.phase_name as current_phase,
  ROUND(upe.current_day * 100.0 / ps.schedule_length_days, 1) as progress_percentage
FROM user_program_enrollment upe
JOIN program p ON upe.program_id = p.id
JOIN program_schedule ps ON p.id = ps.program_id
LEFT JOIN program_phase pp ON p.id = pp.program_id 
  AND upe.current_day BETWEEN pp.start_day AND pp.end_day
WHERE upe.enrollment_status = 'ACTIVE';
```

---

## 🔄 **Common Workflows**

### **1. Program Creation**
```sql
-- 1. Create program metadata
INSERT INTO program (title, description, duration_weeks, difficulty_level_id);

-- 2. Set program goals
INSERT INTO program_goal (program_id, goal_id);

-- 3. Create schedule structure
INSERT INTO program_schedule (program_id, schedule_length_days, rest_days_per_week);

-- 4. Define training phases
INSERT INTO program_phase (program_id, phase_name, start_day, end_day, order_index);

-- 5. Schedule daily workouts
INSERT INTO schedule_workout (program_schedule_id, workout_id, day_number, order_index, is_optional);
```

### **2. User Program Enrollment**
```sql
-- 1. Enroll user in program
INSERT INTO user_program_enrollment (
  user_id, 
  program_id, 
  enrollment_status = 'ACTIVE',
  start_date = CURRENT_DATE,
  current_day = 1
);

-- 2. Calculate target completion date
UPDATE user_program_enrollment SET 
  target_completion_date = start_date + INTERVAL '? weeks'
WHERE id = ?;

-- 3. Create activity record
INSERT INTO activity (user_id, activity_type_id, title, description);
```

### **3. Program Progress Tracking**
```sql
-- Update user progress after workout completion
UPDATE user_program_enrollment SET 
  current_day = current_day + 1,
  updated_at = now()
WHERE user_id = ? AND program_id = ? AND enrollment_status = 'ACTIVE';

-- Check for program completion
UPDATE user_program_enrollment SET 
  enrollment_status = 'COMPLETED',
  actual_completion_date = CURRENT_DATE
WHERE current_day >= (
  SELECT schedule_length_days 
  FROM program_schedule 
  WHERE program_id = ?
);
```

---

## 🧪 **Testing Strategy**

### **Program Integrity Tests**
- Schedule completeness (all days have workouts or are designated rest days)
- Phase coverage (phases cover entire program duration without gaps)
- Workout progression logic (difficulty increases appropriately)
- Goal alignment (workouts support stated program goals)

### **User Experience Tests**
- Program enrollment flow
- Progress tracking accuracy
- Schedule adherence monitoring
- Completion detection logic

### **Performance Tests**
- Program loading speed with full schedule
- Bulk enrollment operations
- Progress calculation performance
- Search and filtering responsiveness

---

## 📋 **Seed Data Requirements**

### **Sample Programs**
```sql
-- Beginner programs
INSERT INTO program (title, description, duration_weeks, difficulty_level_id) VALUES
('Beginner Full Body Program', '4-week introduction to strength training', 4, 1),
('Bodyweight Basics', '6-week program using only bodyweight exercises', 6, 1);

-- Intermediate programs  
INSERT INTO program (title, description, duration_weeks, difficulty_level_id) VALUES
('Upper/Lower Split', '8-week intermediate strength program', 8, 2),
('HIIT Conditioning', '6-week high-intensity interval training', 6, 2);

-- Advanced programs
INSERT INTO program (title, description, duration_weeks, difficulty_level_id) VALUES
('Powerlifting Prep', '12-week competition preparation', 12, 3),
('Advanced Athlete Training', '16-week periodized program', 16, 3);
```

### **Program Phases**
```sql
-- Typical training phases
INSERT INTO program_phase (program_id, phase_name, start_day, end_day, order_index) VALUES
(1, 'Adaptation', 1, 14, 1),
(1, 'Development', 15, 21, 2),
(1, 'Progression', 22, 28, 3);
```

---

## 🚨 **Monitoring & Quality Assurance**

### **Program Health Metrics**
- Program completion rate (target: >70% for beginner programs)
- User adherence rate (sessions completed vs scheduled)
- Phase progression smoothness (no significant dropout at phase transitions)
- Goal achievement correlation (programs achieving stated objectives)

### **Quality Indicators**
- Programs with incomplete schedules
- Phase gaps or overlaps
- Unrealistic workout progressions
- Missing instructional media

---

**Domain Owner**: Program Design Team  
**Last Updated**: December 2024  
**Implementation Status**: Core Complete, Advanced Scheduling In Development


-- Core Infrastructure Tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Visibility levels
CREATE TABLE visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    level SMALLINT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Categories (hierarchical)
CREATE TYPE category_type AS ENUM ('EXERCISE', 'WORKOUT', 'PROGRAM', 'EQUIPMENT', 'MUSCLE');

CREATE TABLE category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    type category_type NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES category(id),
    level SMALLINT NOT NULL DEFAULT 0,
    path VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Tags
CREATE TYPE tag_type AS ENUM ('EXERCISE', 'WORKOUT', 'PROGRAM', 'EQUIPMENT', 'USER');

CREATE TABLE tag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    type tag_type NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Status definitions
CREATE TABLE status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color_code VARCHAR(7),
    is_final BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Difficulty levels
CREATE TABLE difficulty_level (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    value SMALLINT NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Metrics
CREATE TYPE metric_data_type AS ENUM ('INTEGER', 'DECIMAL', 'BOOLEAN', 'TEXT', 'DATE', 'DURATION');

CREATE TABLE metric (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    unit VARCHAR(20) NOT NULL,
    data_type metric_data_type NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    notes TEXT,
    visibility_id UUID NOT NULL REFERENCES visibility(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Muscle groups and muscles
CREATE TABLE muscle_group (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE muscle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(100),
    muscle_group_id UUID NOT NULL REFERENCES muscle_group(id),
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Equipment
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    visibility_id UUID NOT NULL REFERENCES visibility(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Equipment categories and tags
CREATE TABLE equipment_category (
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    category_id UUID NOT NULL REFERENCES category(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (equipment_id, category_id)
);

CREATE TABLE equipment_tag (
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    tag_id UUID NOT NULL REFERENCES tag(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (equipment_id, tag_id)
);

-- Exercises
CREATE TABLE exercise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    instructions TEXT NOT NULL,
    notes TEXT,
    difficulty_level_id UUID NOT NULL REFERENCES difficulty_level(id),
    visibility_id UUID NOT NULL REFERENCES visibility(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Exercise relationships
CREATE TABLE exercise_category (
    exercise_id UUID NOT NULL REFERENCES exercise(id),
    category_id UUID NOT NULL REFERENCES category(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (exercise_id, category_id)
);

CREATE TABLE exercise_tag (
    exercise_id UUID NOT NULL REFERENCES exercise(id),
    tag_id UUID NOT NULL REFERENCES tag(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (exercise_id, tag_id)
);

CREATE TYPE muscle_target_type AS ENUM ('PRIMARY', 'SECONDARY', 'STABILIZER');

CREATE TABLE exercise_muscle_target (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID NOT NULL REFERENCES exercise(id),
    muscle_id UUID NOT NULL REFERENCES muscle(id),
    target_type muscle_target_type NOT NULL,
    intensity SMALLINT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Exercise equipment relationships
CREATE TABLE exercise_equipment (
    exercise_id UUID NOT NULL REFERENCES exercise(id),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    is_required BOOLEAN NOT NULL DEFAULT true,
    usage_notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (exercise_id, equipment_id)
);

-- Workouts
CREATE TABLE workout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    duration_seconds SMALLINT NOT NULL,
    difficulty_level_id UUID NOT NULL REFERENCES difficulty_level(id),
    notes TEXT,
    visibility_id UUID NOT NULL REFERENCES visibility(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Workout relationships
CREATE TABLE workout_category (
    workout_id UUID NOT NULL REFERENCES workout(id),
    category_id UUID NOT NULL REFERENCES category(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (workout_id, category_id)
);

CREATE TABLE workout_tag (
    workout_id UUID NOT NULL REFERENCES tag(id),
    tag_id UUID NOT NULL REFERENCES tag(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (workout_id, tag_id)
);

-- Workout structure
CREATE TABLE workout_set (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workout(id),
    name VARCHAR(100) NOT NULL,
    rest_seconds SMALLINT NOT NULL DEFAULT 0,
    target_muscle_id UUID NOT NULL REFERENCES muscle(id),
    order_index SMALLINT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE exercise_instruction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_set_id UUID NOT NULL REFERENCES workout_set(id),
    exercise_id UUID NOT NULL REFERENCES exercise(id),
    sets_count SMALLINT NOT NULL DEFAULT 1,
    reps_count SMALLINT,
    weight_kg DECIMAL,
    duration_seconds SMALLINT,
    rest_seconds SMALLINT NOT NULL DEFAULT 0,
    order_index SMALLINT NOT NULL,
    custom_instructions TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Programs
CREATE TABLE program (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    difficulty_level_id UUID NOT NULL REFERENCES difficulty_level(id),
    notes TEXT,
    visibility_id UUID NOT NULL REFERENCES visibility(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Program relationships
CREATE TABLE program_category (
    program_id UUID NOT NULL REFERENCES program(id),
    category_id UUID NOT NULL REFERENCES category(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (program_id, category_id)
);

CREATE TABLE program_tag (
    program_id UUID NOT NULL REFERENCES program(id),
    tag_id UUID NOT NULL REFERENCES tag(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (program_id, tag_id)
);

-- Program schedule
CREATE TABLE program_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES program(id),
    length_days SMALLINT NOT NULL,
    rest_days_per_week SMALLINT NOT NULL DEFAULT 1,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE schedule_workout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES program_schedule(id),
    workout_id UUID NOT NULL REFERENCES workout(id),
    day_number SMALLINT NOT NULL,
    order_index SMALLINT NOT NULL DEFAULT 0,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- User progress tracking
CREATE TYPE enrollment_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

CREATE TABLE user_program_enrollment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    program_id UUID NOT NULL REFERENCES program(id),
    status enrollment_status NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    current_day SMALLINT NOT NULL DEFAULT 1,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TYPE session_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

CREATE TABLE user_workout_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    workout_id UUID NOT NULL REFERENCES workout(id),
    enrollment_id UUID REFERENCES user_program_enrollment(id),
    status session_status NOT NULL DEFAULT 'PLANNED',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds SMALLINT,
    effort_rating SMALLINT,
    soreness_rating SMALLINT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- User measurements
CREATE TYPE measurement_source AS ENUM ('MANUAL', 'DEVICE', 'CALCULATED', 'ESTIMATED');

CREATE TABLE user_measurement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    metric_id UUID NOT NULL REFERENCES metric(id),
    value DECIMAL NOT NULL,
    measurement_date DATE NOT NULL,
    notes TEXT,
    source measurement_source NOT NULL DEFAULT 'MANUAL',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Initial data
INSERT INTO visibility (id, name, description, level, created_by) VALUES
    (uuid_generate_v4(), 'PUBLIC', 'Visible to everyone', 0, uuid_generate_v4()),
    (uuid_generate_v4(), 'PRIVATE', 'Visible only to owner', 100, uuid_generate_v4()),
    (uuid_generate_v4(), 'FRIENDS', 'Visible to friends only', 50, uuid_generate_v4());

INSERT INTO difficulty_level (id, name, value, description, created_by) VALUES
    (uuid_generate_v4(), 'BEGINNER', 1, 'Suitable for beginners', uuid_generate_v4()),
    (uuid_generate_v4(), 'INTERMEDIATE', 3, 'Requires some experience', uuid_generate_v4()),
    (uuid_generate_v4(), 'ADVANCED', 5, 'For experienced users', uuid_generate_v4()),
    (uuid_generate_v4(), 'EXPERT', 7, 'Expert level difficulty', uuid_generate_v4());

-- DOWN MIGRATION
DROP TABLE IF EXISTS user_measurement CASCADE;
DROP TABLE IF EXISTS user_workout_session CASCADE;
DROP TABLE IF EXISTS user_program_enrollment CASCADE;
DROP TABLE IF EXISTS schedule_workout CASCADE;
DROP TABLE IF EXISTS program_schedule CASCADE;
DROP TABLE IF EXISTS program_tag CASCADE;
DROP TABLE IF EXISTS program_category CASCADE;
DROP TABLE IF EXISTS program CASCADE;
DROP TABLE IF EXISTS exercise_instruction CASCADE;
DROP TABLE IF EXISTS workout_set CASCADE;
DROP TABLE IF EXISTS workout_tag CASCADE;
DROP TABLE IF EXISTS workout_category CASCADE;
DROP TABLE IF EXISTS workout CASCADE;
DROP TABLE IF EXISTS exercise_equipment CASCADE;
DROP TABLE IF EXISTS exercise_muscle_target CASCADE;
DROP TABLE IF EXISTS exercise_tag CASCADE;
DROP TABLE IF EXISTS exercise_category CASCADE;
DROP TABLE IF EXISTS exercise CASCADE;
DROP TABLE IF EXISTS equipment_tag CASCADE;
DROP TABLE IF EXISTS equipment_category CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS muscle CASCADE;
DROP TABLE IF EXISTS muscle_group CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS metric CASCADE;
DROP TABLE IF EXISTS difficulty_level CASCADE;
DROP TABLE IF EXISTS status CASCADE;
DROP TABLE IF EXISTS tag CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS visibility CASCADE;

DROP TYPE IF EXISTS measurement_source;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS enrollment_status;
DROP TYPE IF EXISTS muscle_target_type;
DROP TYPE IF EXISTS metric_data_type;
DROP TYPE IF EXISTS tag_type;
DROP TYPE IF EXISTS category_type;

-- backend/src/database/config/database.config.ts

import { DatabaseConfig } from '../types/DatabaseTypes';

/**
 * Database configuration factory
 */
export class DatabaseConfigFactory {
  static createFromEnvironment(): DatabaseConfig {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ] as const;

    // Validate required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      connection: {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT!, 10),
        database: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '2000', 10),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      },
      migrations: {
        path: process.env.DB_MIGRATIONS_PATH ?? './src/database/migrations',
        autoRun: process.env.DB_AUTO_MIGRATE === 'true',
      },
      indexes: {
        autoCreate: process.env.DB_AUTO_INDEX !== 'false',
        analyzeUsage: process.env.DB_ANALYZE_INDEXES === 'true',
      },
    };
  }

  static createForTesting(): DatabaseConfig {
    return {
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'motriforge_test',
        user: 'test_user',
        password: 'test_password',
        max: 5,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 1000,
      },
      migrations: {
        path: './src/database/migrations',
        autoRun: true,
      },
      indexes: {
        autoCreate: true,
        analyzeUsage: false,
      },
    };
  }
}


CREATE TYPE "public"."action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'modify');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('user', 'institution', 'resource', 'system', 'service');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical');--> statement-breakpoint
CREATE TYPE "public"."severity_type" AS ENUM('debug', 'info', 'warn', 'error', 'audit', 'lifecycle');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"action" "action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"session_id" text,
	"reason" text,
	"audit_batch_id" text,
	"created_by" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cache_log" (
	"id" text PRIMARY KEY NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"operation" varchar(50) NOT NULL,
	"strategy" varchar(50) NOT NULL,
	"hit_rate" smallint,
	"response_time_ms" integer,
	"data_size_bytes" integer,
	"ttl_seconds" integer,
	"user_id" text,
	"session_id" text,
	"context_data" jsonb,
	"created_by" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_lifecycle_log" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"operation" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"policy_id" text,
	"executed_by" text NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"data_size_bytes" integer,
	"affected_records" integer DEFAULT 1 NOT NULL,
	"operation_details" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"error_code" varchar(100) NOT NULL,
	"error_message" varchar(500) NOT NULL,
	"error_description" text,
	"severity_id" text NOT NULL,
	"user_id" text,
	"source_component" varchar(100) NOT NULL,
	"source_method" varchar(200),
	"stack_trace" text,
	"context_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"session_id" text,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"created_by" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_action_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_action_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_actor_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_actor_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_log" (
	"id" text PRIMARY KEY NOT NULL,
	"event_actor_id" text NOT NULL,
	"event_action_id" text NOT NULL,
	"event_scope_id" text NOT NULL,
	"event_target_id" text NOT NULL,
	"severity_id" text NOT NULL,
	"user_id" text,
	"session_id" text,
	"trace_id" text,
	"parent_event_id" text,
	"event_data" jsonb NOT NULL,
	"context_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"status" "event_status" DEFAULT 'completed' NOT NULL,
	"error_details" text,
	"created_by" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_scope_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_scope_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_target_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_target_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "severity_classification" (
	"id" text PRIMARY KEY NOT NULL,
	"level" varchar(20) NOT NULL,
	"type" varchar(20) NOT NULL,
	"requires_notification" boolean DEFAULT false NOT NULL,
	"priority_order" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_log" ADD CONSTRAINT "error_log_severity_id_severity_classification_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_actor_id_event_actor_type_id_fk" FOREIGN KEY ("event_actor_id") REFERENCES "public"."event_actor_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_action_id_event_action_type_id_fk" FOREIGN KEY ("event_action_id") REFERENCES "public"."event_action_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_scope_id_event_scope_type_id_fk" FOREIGN KEY ("event_scope_id") REFERENCES "public"."event_scope_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_target_id_event_target_type_id_fk" FOREIGN KEY ("event_target_id") REFERENCES "public"."event_target_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_severity_id_severity_classification_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_classification"("id") ON DELETE no action ON UPDATE no action;
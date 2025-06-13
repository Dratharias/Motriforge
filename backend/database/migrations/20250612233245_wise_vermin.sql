CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"reason" text,
	"ip_address" "inet",
	"user_agent" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"error_code" text,
	"error_message" text NOT NULL,
	"error_description" text,
	"severity_id" text NOT NULL,
	"source_component" text NOT NULL,
	"source_method" text,
	"stack_trace" text,
	"context_data" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_action_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_action_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_actor_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
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
	"status" text DEFAULT 'completed' NOT NULL,
	"error_details" text,
	"created_by" text NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_scope_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_scope_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "event_target_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "event_target_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "severity_classification" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text,
	"type" text NOT NULL,
	"requires_notification" boolean DEFAULT false NOT NULL,
	"priority_order" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"event_actor_id" text NOT NULL,
	"event_action_id" text NOT NULL,
	"event_scope_id" text NOT NULL,
	"event_target_id" text NOT NULL,
	"severity_id" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"correlation_id" text,
	"trace_id" text,
	"parent_event_id" text,
	"user_id" text,
	"session_id" text,
	"source_component" text NOT NULL,
	"source_file" text,
	"line_number" integer,
	"stack_trace" text,
	"ip_address" "inet",
	"user_agent" text,
	"created_by" text NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_summary" (
	"hour" timestamp NOT NULL,
	"severity_id" text NOT NULL,
	"source_component" text NOT NULL,
	"log_count" integer NOT NULL,
	"unique_users" integer NOT NULL,
	"unique_sessions" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_log" ADD CONSTRAINT "error_log_severity_id_severity_classification_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_actor_id_event_actor_type_id_fk" FOREIGN KEY ("event_actor_id") REFERENCES "public"."event_actor_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_action_id_event_action_type_id_fk" FOREIGN KEY ("event_action_id") REFERENCES "public"."event_action_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_scope_id_event_scope_type_id_fk" FOREIGN KEY ("event_scope_id") REFERENCES "public"."event_scope_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_event_target_id_event_target_type_id_fk" FOREIGN KEY ("event_target_id") REFERENCES "public"."event_target_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_severity_id_severity_classification_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_event_actor_id_event_actor_type_id_fk" FOREIGN KEY ("event_actor_id") REFERENCES "public"."event_actor_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_event_action_id_event_action_type_id_fk" FOREIGN KEY ("event_action_id") REFERENCES "public"."event_action_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_event_scope_id_event_scope_type_id_fk" FOREIGN KEY ("event_scope_id") REFERENCES "public"."event_scope_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_event_target_id_event_target_type_id_fk" FOREIGN KEY ("event_target_id") REFERENCES "public"."event_target_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_severity_id_severity_classification_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_log_occurred_at" ON "event_log" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_event_log_trace" ON "event_log" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_event_log_user" ON "event_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_log_pattern" ON "event_log" USING btree ("event_actor_id","event_action_id","event_scope_id","event_target_id");--> statement-breakpoint
CREATE INDEX "idx_severity_level_type" ON "severity_classification" USING btree ("level","type");--> statement-breakpoint
CREATE INDEX "idx_severity_priority" ON "severity_classification" USING btree ("priority_order");--> statement-breakpoint
CREATE INDEX "idx_log_entry_logged_at" ON "log_entry" USING btree ("logged_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_log_entry_trace" ON "log_entry" USING btree ("trace_id") WHERE "log_entry"."trace_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_log_entry_correlation" ON "log_entry" USING btree ("correlation_id") WHERE "log_entry"."correlation_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_log_entry_user" ON "log_entry" USING btree ("user_id") WHERE "log_entry"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_log_entry_session" ON "log_entry" USING btree ("session_id") WHERE "log_entry"."session_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_log_entry_source" ON "log_entry" USING btree ("source_component");--> statement-breakpoint
CREATE INDEX "idx_log_entry_pattern" ON "log_entry" USING btree ("event_actor_id","event_action_id","event_scope_id","event_target_id");--> statement-breakpoint
CREATE INDEX "idx_log_entry_user_time" ON "log_entry" USING btree ("user_id","logged_at" DESC NULLS LAST) WHERE "log_entry"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_log_summary_hour" ON "log_summary" USING btree ("hour" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_log_summary_severity" ON "log_summary" USING btree ("severity_id");
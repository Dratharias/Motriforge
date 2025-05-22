import { EventSchema } from "@/core/events/EventSchema";

/**
 * Configuration for event persistance policy
 */
export interface PersistencePolicy {
  persistent: boolean;
  ttl?: number;
  collection?: string;
}

/**
 * Definition of an event type
 */
export interface EventTypeDefinition {
  name: string;
  description: string;
  schema: EventSchema;
  metadata: Record<string, any>;
  version: string;
  deprecated?: boolean;
  groups: string[];
  persistencePolicy?: PersistencePolicy;
}

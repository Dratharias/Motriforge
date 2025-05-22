import { EventMediator } from "@/core/events/EventMediator";
import { EventPublisher } from "@/core/events/EventPublisher";


/**
 * Options for the cache manager
 */
export interface CacheManagerOptions {
  defaultAdapterName?: string;
  eventMediator?: EventMediator;
  eventPublisher?: EventPublisher;
  enableHealthMonitoring?: boolean;
}
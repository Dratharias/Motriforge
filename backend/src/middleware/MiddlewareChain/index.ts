export { MiddlewareChain, MiddlewareChainFactory } from './MiddlewareChain';
export { ChainValidator } from './ChainValidator';
export { ChainExecutor } from './ChainExecutor';

// Types and interfaces
export type {
  ChainExecutionResult,
  MiddlewareExecutionResult,
  ChainPerformanceMetrics,
  ChainExecutionOptions,
  ParallelGroup,
  ChainExecutionContext,
  ChainInfo,
  ChainValidationResult,
  MiddlewareChainConfig
} from '@/types/middleware/chain/chain-types';

// Enums
export { ChainState } from '@/types/middleware/chain/chain-types';
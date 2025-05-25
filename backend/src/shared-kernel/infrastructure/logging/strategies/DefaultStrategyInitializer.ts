import { LogConfiguration } from '@/types/shared/infrastructure/logging';
import { IStrategyManager } from '../strategy/IStrategyManager';
import { ConsoleLogStrategy } from './ConsoleLogStrategy';
import { FileLogStrategy } from './FileLogStrategy';
import { JsonLogFormatter } from '../formatters/JsonLogFormatter';
import { TextLogFormatter } from '../formatters/TextLogFormatter';

/**
 * Default Strategy Initializer - Single responsibility: initializing default strategies
 */
export class DefaultStrategyInitializer {
  static initialize(strategyManager: IStrategyManager, config: LogConfiguration): void {
    const jsonFormatter = new JsonLogFormatter();
    const textFormatter = new TextLogFormatter();

    // Add formatters
    strategyManager.addFormatter(jsonFormatter);
    strategyManager.addFormatter(textFormatter);

    // Initialize strategies based on configuration
    if (config.enableConsole) {
      const consoleStrategy = new ConsoleLogStrategy(textFormatter);
      strategyManager.addStrategy(consoleStrategy);
    }

    if (config.enableFile) {
      const fileStrategy = new FileLogStrategy(
        './logs/app.log',
        jsonFormatter
      );
      strategyManager.addStrategy(fileStrategy);
    }

    // Additional strategies can be added here based on configuration
    // if (config.enableRemote) { ... }
    // if (config.enableDatabase) { ... }
  }
}


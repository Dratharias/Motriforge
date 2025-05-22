import { LogConfig, LogEntry, LogFormatter, LogLevel, LogProvider, LogTransport, TransportConfig } from '@/types/logging';
import { createErrorInfo } from '../error/ErrorInfo';
import { JsonFormatter } from './formatters/JsonFormatter';
import { LogContextManager } from './LogContextManager';
import { createLogEntry } from './LogEntry';
import { LogMetrics } from './LogMetrics';
import { ConsoleTransport } from './transports/ConsoleTransport';


export class LoggerService {
  private readonly logProvider: LogProvider | null;
  private readonly transports: Map<string, LogTransport>;
  private formatter: LogFormatter;
  private readonly config: LogConfig;
  private readonly contextManager: LogContextManager;
  private readonly metrics: LogMetrics;
  
  private logLevel: LogLevel;

  constructor(
    config: LogConfig,
    contextManager: LogContextManager,
    metrics: LogMetrics,
    logProvider?: LogProvider
  ) {
    this.config = config;
    this.contextManager = contextManager;
    this.metrics = metrics;
    this.logProvider = logProvider || null;
    
    this.logLevel = typeof config.defaultLevel === 'string'
      ? LogLevel[config.defaultLevel as keyof typeof LogLevel] || LogLevel.INFO
      : config.defaultLevel || LogLevel.INFO;
    
    this.formatter = new JsonFormatter();
    this.transports = new Map();
  }

  public async initialize(): Promise<void> {
    // Initialize default transports
    this.initializeTransports();
    
    // Register additional transports defined in the configuration
    for (const [id, transportConfig] of Object.entries(this.config.transports)) {
      if (!transportConfig.id) {
        transportConfig.id = id;
      }
      
      // Skip if this transport is not enabled
      if (!this.config.enabledTransports.includes(id)) {
        continue;
      }
      
      // Skip if already initialized
      if (this.transports.has(id)) {
        continue;
      }
      
      try {
        const transport = await this.createTransport(transportConfig);
        if (transport) {
          this.registerTransport(id, transport);
        }
      } catch (error) {
        console.error(`Failed to initialize transport ${id}:`, error);
      }
    }
    
    // If no transports are configured, ensure we have a default console transport
    if (this.transports.size === 0) {
      this.registerTransport('console', new ConsoleTransport({
        id: 'console',
        enabled: true,
        minLevel: this.logLevel
      }));
    }
  }

  public log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Track metrics
    this.trackMetrics(level);
    
    // Create and enrich the log entry
    const entry = this.createLogEntry(level, message, meta);
    const enrichedEntry = this.enrichLogEntry(entry);
    
    // Send to log provider if available
    if (this.logProvider) {
      this.logProvider.log(enrichedEntry);
      return;
    }
    
    // Otherwise, send to all transports
    for (const transport of this.transports.values()) {
      if (transport.enabled && level >= transport.minLevel) {
        // Use the formatter to format the entry before sending to transport
        const formattedEntry = this.formatLogEntry(enrichedEntry);
        transport.transport(formattedEntry).catch(err => {
          console.error(`Error sending log to transport ${transport.id}:`, err);
        });
      }
    }
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return;
    }
    
    const errorInfo = error ? createErrorInfo(error) : undefined;
    const mergedMeta = { ...meta, error: errorInfo };
    
    this.log(LogLevel.ERROR, message, mergedMeta);
  }

  public createChildLogger(context: Record<string, any>): LoggerService {
    // Create a new service with the same configuration but with additional context
    const childLogger = new LoggerService(
      this.config,
      this.contextManager,
      this.metrics,
      this.logProvider ?? undefined
    );
    
    // Copy the existing transports and formatter to the child logger
    for (const [id, transport] of this.transports.entries()) {
      childLogger.registerTransport(id, transport);
    }
    
    childLogger.setFormatter(this.formatter);
    
    // Set the child context
    childLogger.setChildContext(context);
    
    return childLogger;
  }

  public registerTransport(id: string, transport: LogTransport): void {
    this.transports.set(id, transport);
  }

  public removeTransport(id: string): void {
    const transport = this.transports.get(id);
    if (transport) {
      transport.close().catch(() => {});
      this.transports.delete(id);
    }
  }

  public setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  public getFormatter(): LogFormatter {
    return this.formatter;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getTransports(): LogTransport[] {
    return Array.from(this.transports.values());
  }

  public async flush(): Promise<void> {
    if (this.logProvider) {
      await this.logProvider.flush();
      return;
    }
    
    await Promise.all(
      Array.from(this.transports.values()).map(transport => 
        transport.flush().catch(err => {
          console.error(`Error flushing transport ${transport.id}:`, err);
        })
      )
    );
  }

  public async close(): Promise<void> {
    await this.flush();
    
    await Promise.all(
      Array.from(this.transports.values()).map(transport => 
        transport.close().catch(err => {
          console.error(`Error closing transport ${transport.id}:`, err);
        })
      )
    );
    
    this.transports.clear();
  }

  private initializeTransports(): void {
    // If console transport is enabled in config, initialize it
    if (this.config.enabledTransports.includes('console')) {
      const consoleConfig = this.config.transports.console || {
        id: 'console',
        enabled: true,
        minLevel: this.logLevel
      };
      
      this.registerTransport('console', new ConsoleTransport(consoleConfig));
    }
    
    // For other built-in transports, we'll handle them in the initialize() method
    // which will dynamically load and create the transports based on the configuration
  }

  private setChildContext(context: Record<string, any>): void {
    // In a real implementation, this would store the child context
    // to be merged with the parent context when creating log entries
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, meta?: Record<string, any>): LogEntry {
    const context = this.contextManager.getContext();
    
    return createLogEntry(level, message, context, {
      metadata: meta
    });
  }

  private enrichLogEntry(entry: LogEntry): LogEntry {
    // Add host info
    entry.metadata ??= {};
    
    entry.metadata.host ??= {
        hostname: process.env.HOSTNAME ?? 'unknown',
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      };
    
    return entry;
  }

  private formatLogEntry(entry: LogEntry): LogEntry {
    // Use the formatter to format the entry if needed
    // For now, we'll just return the entry as-is since transports handle their own formatting
    // But this method provides a hook for central formatting if needed
    return entry;
  }

  private trackMetrics(level: LogLevel): void {
    this.metrics.incrementCounter('logs.total');
    
    // Track by log level
    const levelName = LogLevel[level].toLowerCase();
    this.metrics.incrementCounter(`logs.level.${levelName}`);
  }

  private async createTransport(config: TransportConfig): Promise<LogTransport | null> {
    switch (config.id) {
      case 'console': {
        return new ConsoleTransport(config);
      }
      case 'file': {
        // Scoped block to allow lexical declarations
        const { FileTransport } = await import('./transports/FileTransport');
        return new FileTransport(config as any);
      }
      case 'cloud': {
        // Scoped block to allow lexical declarations
        const { CloudTransport } = await import('./transports/CloudTransport');
        return new CloudTransport(config as any);
      }
      default: {
        try {
          const customModule = await import(`./transports/${config.id}Transport`);
          const CustomTransport = customModule[`${config.id}Transport`];
          if (CustomTransport && typeof CustomTransport === 'function') {
            return new CustomTransport(config);
          }
          throw new Error(`Transport class not found: ${config.id}Transport`);
        } catch (error) {
          console.error(`Failed to load custom transport: ${config.id}`, error);
          return null;
        }
      }
    }
  }
}
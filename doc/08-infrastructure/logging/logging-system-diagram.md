```mermaid
classDiagram
    %% Logging System Architecture
    
    class LoggerFacade {
        <<Facade>>
        -loggerService: LoggerService
        -configService: ConfigService
        -contextProvider: LogContextProvider
        +debug(message: string, meta?: Record~string, any~): void
        +info(message: string, meta?: Record~string, any~): void
        +warn(message: string, meta?: Record~string, any~): void
        +error(message: string, error?: Error, meta?: Record~string, any~): void
        +fatal(message: string, error?: Error, meta?: Record~string, any~): void
        +child(context: Record~string, any~): LoggerFacade
        +withContext(context: Record~string, any~): LoggerFacade
        +withComponent(component: string): LoggerFacade
        +setLogLevel(level: LogLevel): void
        +getLogLevel(): LogLevel
    }
    
    class LoggerService {
        <<Service>>
        -logProvider: LogProvider
        -transports: Map~string, LogTransport~
        -formatter: LogFormatter
        -config: LogConfig
        -contextManager: LogContextManager
        -metrics: LogMetrics
        +initialize(): Promise~void~
        +log(level: LogLevel, message: string, meta?: Record~string, any~): void
        +error(message: string, error?: Error, meta?: Record~string, any~): void
        +createChildLogger(context: Record~string, any~): LoggerService
        +registerTransport(id: string, transport: LogTransport): void
        +removeTransport(id: string): void
        +setFormatter(formatter: LogFormatter): void
        +setLogLevel(level: LogLevel): void
        +getTransports(): LogTransport[]
        -shouldLog(level: LogLevel): boolean
        -enrichLogEntry(entry: LogEntry): LogEntry
        -trackMetrics(level: LogLevel): void
    }
    
    class LogProvider {
        <<Interface>>
        +log(entry: LogEntry): void
        +flush(): Promise~void~
        +getCapabilities(): LogProviderCapabilities
    }
    
    class LogTransport {
        <<Interface>>
        +id: string
        +enabled: boolean
        +minLevel: LogLevel
        +transport(entry: LogEntry): Promise~void~
        +flush(): Promise~void~
        +close(): Promise~void~
    }
    
    class ConsoleTransport {
        <<Transport>>
        -formatters: Map~LogLevel, (entry: LogEntry) => string~
        -colorized: boolean
        -config: ConsoleTransportConfig
        +id: string
        +enabled: boolean
        +minLevel: LogLevel
        +transport(entry: LogEntry): Promise~void~
        +flush(): Promise~void~
        +close(): Promise~void~
        -formatConsoleMessage(entry: LogEntry): string
        -getLogColor(level: LogLevel): string
    }
    
    class FileTransport {
        <<Transport>>
        -fileStream: WriteStream
        -formatter: LogFormatter
        -rotationConfig: FileRotationConfig
        -queue: LogEntry[]
        -flushInterval: number
        -path: string
        +id: string
        +enabled: boolean
        +minLevel: LogLevel
        +transport(entry: LogEntry): Promise~void~
        +flush(): Promise~void~
        +close(): Promise~void~
        -rotateLogIfNeeded(): Promise~void~
        -initializeFileStream(): void
        -compressOldLogs(): Promise~void~
    }
    
    class CloudTransport {
        <<Transport>>
        -client: HttpClient
        -endpoint: string
        -apiKey: string
        -batchSize: number
        -flushInterval: number
        -queue: LogEntry[]
        -retryStrategy: RetryStrategy
        +id: string
        +enabled: boolean
        +minLevel: LogLevel
        +transport(entry: LogEntry): Promise~void~
        +flush(): Promise~void~
        +close(): Promise~void~
        -sendBatch(entries: LogEntry[]): Promise~void~
        -handleFailedBatch(entries: LogEntry[], error: Error): void
    }
    
    class LogFormatter {
        <<Interface>>
        +format(entry: LogEntry): string
        +getContentType(): string
    }
    
    class JsonFormatter {
        <<Formatter>>
        -replacer: (key: string, value: any) => any
        -includeStack: boolean
        -maskSensitiveData: boolean
        -sensitiveKeys: string[]
        +format(entry: LogEntry): string
        +getContentType(): string
        -sanitizeObject(obj: any): any
        -maskSensitiveFields(obj: any): any
    }
    
    class SimpleFormatter {
        <<Formatter>>
        -template: string
        -dateFormat: string
        +format(entry: LogEntry): string
        +getContentType(): string
        -formatDate(date: Date): string
        -interpolate(template: string, data: any): string
    }
    
    class LogContextManager {
        <<Service>>
        -contextStorage: AsyncLocalStorage~LogContext~
        -globalContext: LogContext
        +getContext(): LogContext
        +setContext(context: LogContext): void
        +withContext~T~(context: LogContext, fn: () => T): T
        +getRequestContext(): RequestContext
        +setContextFromRequest(request: Request): void
        +enrichFromEnvironment(context: LogContext): LogContext
        +mergeContexts(contexts: LogContext[]): LogContext
    }
    
    class LogMetrics {
        <<Service>>
        -counters: Map~string, number~
        -gauges: Map~string, () => number~
        -histograms: Map~string, number[]~
        -metricRegistry: MetricRegistry
        +incrementCounter(name: string, value?: number): void
        +setGauge(name: string, value: number | (() => number)): void
        +recordValue(name: string, value: number): void
        +getMetrics(): Record~string, any~
        +resetMetrics(): void
        +registerWithMetricsSystem(): void
    }
    
    class LogMiddleware {
        <<Middleware>>
        -logger: LoggerFacade
        -options: LogMiddlewareOptions
        +execute(request: Request, next: NextFunction): Promise~Response~
        -logRequest(request: Request): void
        -logResponse(response: Response, request: Request, duration: number): void
        -shouldSkip(request: Request): boolean
        -sanitizeHeaders(headers: Record~string, string~): Record~string, string~
    }
    
    class RequestLogEnricher {
        <<Utility>>
        +enrichLogFromRequest(entry: LogEntry, request: Request): LogEntry
        +extractUserInfo(request: Request): UserInfo | null
        +extractClientInfo(request: Request): ClientInfo
        +extractPerformanceMetrics(request: Request): PerformanceMetrics
        +sanitizeRequestData(request: Request): any
    }
    
    class LogEntry {
        <<ValueObject>>
        +timestamp: Date
        +level: LogLevel
        +message: string
        +context: LogContext
        +component?: string
        +error?: ErrorInfo
        +metadata?: Record~string, any~
        +requestId?: string
        +userId?: string
        +organizationId?: string
        +sessionId?: string
        +correlationId?: string
        +resourceId?: string
        +clientInfo?: ClientInfo
        +duration?: number
    }
    
    class LogContext {
        <<ValueObject>>
        +component?: string
        +requestId?: string
        +userId?: string
        +organizationId?: string
        +sessionId?: string
        +correlationId?: string
        +environment?: string
        +version?: string
        +custom?: Record~string, any~
    }
    
    class ErrorInfo {
        <<ValueObject>>
        +name: string
        +message: string
        +stack?: string
        +code?: string
        +cause?: ErrorInfo
        +metadata?: Record~string, any~
    }
    
    class LogLevel {
        <<Enumeration>>
        TRACE: 0
        DEBUG: 1
        INFO: 2
        WARN: 3
        ERROR: 4
        FATAL: 5
        SILENT: 6
    }
    
    class LogConfig {
        <<Configuration>>
        +defaultLevel: LogLevel
        +enabledTransports: string[]
        +transports: Record~string, TransportConfig~
        +formatter: FormatterConfig
        +context: ContextConfig
        +sampling: SamplingConfig
        +redaction: RedactionConfig
    }
    
    %% Relationships
    LoggerFacade --> LoggerService : uses
    LoggerFacade --> LogContextProvider : uses
    
    LoggerService --> LogProvider : delegates to
    LoggerService --> LogTransport : manages
    LoggerService --> LogFormatter : uses
    LoggerService --> LogContextManager : uses
    LoggerService --> LogMetrics : tracks via
    
    ConsoleTransport --|> LogTransport : implements
    FileTransport --|> LogTransport : implements
    CloudTransport --|> LogTransport : implements
    
    JsonFormatter --|> LogFormatter : implements
    SimpleFormatter --|> LogFormatter : implements
    
    LogMiddleware --> LoggerFacade : uses
    LogMiddleware --> RequestLogEnricher : uses
    
    LoggerService --> LogEntry : creates
    LogContextManager --> LogContext : manages
    LogEntry "1" --> "1" LogContext : contains
    LogEntry "1" --> "0..1" ErrorInfo : may contain```

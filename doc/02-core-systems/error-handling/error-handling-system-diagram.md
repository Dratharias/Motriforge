```mermaid
classDiagram
    %% Error Handling System Architecture
    
    class ErrorHandlingFacade {
        <<Facade>>
        -errorHandlerRegistry: ErrorHandlerRegistry
        -errorMapperRegistry: ErrorMapperRegistry
        -errorFormatterRegistry: ErrorFormatterRegistry
        -logger: LoggerFacade
        -eventMediator: EventMediator
        +handleError(error: Error, context?: ErrorContext): ErrorResult
        +formatError(error: Error, format?: string): FormattedError
        +mapToApiError(error: Error): ApiError
        +createError(code: string, message: string, details?: any): ApplicationError
        +wrapError(originalError: Error, message: string): ApplicationError
        +logError(error: Error, context?: ErrorContext): void
        +isApplicationError(error: any): boolean
        +isKnownError(error: any): boolean
    }
    
    class ErrorHandlerRegistry {
        <<Registry>>
        -handlers: Map~string, ErrorHandler~
        -priorityHandlers: ErrorHandler[]
        -defaultHandler: ErrorHandler
        -logger: LoggerFacade
        +registerHandler(errorType: string, handler: ErrorHandler): void
        +registerPriorityHandler(handler: ErrorHandler): void
        +setDefaultHandler(handler: ErrorHandler): void
        +getHandler(error: Error): ErrorHandler
        +getAllHandlers(): ErrorHandler[]
        +getHandlerForType(errorType: string): ErrorHandler | null
        -findMatchingHandler(error: Error): ErrorHandler | null
        -sortPriorityHandlers(): void
    }
    
    class ErrorMapperRegistry {
        <<Registry>>
        -mappers: Map~string, ErrorMapper~
        -priorityMappers: ErrorMapper[]
        -defaultMapper: ErrorMapper
        +registerMapper(errorType: string, mapper: ErrorMapper): void
        +registerPriorityMapper(mapper: ErrorMapper): void
        +setDefaultMapper(mapper: ErrorMapper): void
        +getMapper(error: Error): ErrorMapper
        +getAllMappers(): ErrorMapper[]
        +getMapperForType(errorType: string): ErrorMapper | null
        -findMatchingMapper(error: Error): ErrorMapper | null
        -sortPriorityMappers(): void
    }
    
    class ErrorFormatterRegistry {
        <<Registry>>
        -formatters: Map~string, ErrorFormatter~
        -defaultFormatter: ErrorFormatter
        +registerFormatter(format: string, formatter: ErrorFormatter): void
        +setDefaultFormatter(formatter: ErrorFormatter): void
        +getFormatter(format: string): ErrorFormatter
        +getAllFormatters(): ErrorFormatter[]
    }
    
    class ErrorHandler {
        <<Interface>>
        +handle(error: Error, context?: ErrorContext): ErrorResult
        +canHandle(error: Error): boolean
        +getPriority(): number
    }
    
    class ErrorMapper {
        <<Interface>>
        +map(error: Error): ApiError
        +canMap(error: Error): boolean
        +getPriority(): number
    }
    
    class ErrorFormatter {
        <<Interface>>
        +format(error: Error | ApiError): FormattedError
        +getSupportedFormats(): string[]
    }
    
    class ValidationErrorHandler {
        <<Handler>>
        -config: ValidationErrorConfig
        -logger: LoggerFacade
        +handle(error: ValidationError, context?: ErrorContext): ErrorResult
        +canHandle(error: Error): boolean
        +getPriority(): number
        -formatValidationErrors(errors: ValidationErrorDetail[]): Record~string, string~
        -shouldLogValidationError(error: ValidationError): boolean
    }
    
    class DatabaseErrorHandler {
        <<Handler>>
        -config: DatabaseErrorConfig
        -logger: LoggerFacade
        +handle(error: DatabaseError, context?: ErrorContext): ErrorResult
        +canHandle(error: Error): boolean
        +getPriority(): number
        -mapDatabaseError(error: DatabaseError): ApplicationError
        -sanitizeDatabaseError(error: DatabaseError): Record~string, any~
    }
    
    class AuthErrorHandler {
        <<Handler>>
        -config: AuthErrorConfig
        -logger: LoggerFacade
        -authService: AuthService
        +handle(error: AuthError, context?: ErrorContext): ErrorResult
        +canHandle(error: Error): boolean
        +getPriority(): number
        -handleTokenExpired(error: TokenExpiredError, context?: ErrorContext): ErrorResult
        -handleInvalidCredentials(error: InvalidCredentialsError, context?: ErrorContext): ErrorResult
    }
    
    class HttpErrorMapper {
        <<Mapper>>
        -errorCodeMap: Map~string, number~
        +map(error: Error): ApiError
        +canMap(error: Error): boolean
        +getPriority(): number
        -getStatusCode(error: Error): number
        -mapErrorCode(errorCode: string): number
    }
    
    class JsonErrorFormatter {
        <<Formatter>>
        -includeStack: boolean
        -masks: Record~string, boolean~
        +format(error: Error | ApiError): FormattedError
        +getSupportedFormats(): string[]
        -formatError(error: Error | ApiError): Record~string, any~
        -maskSensitiveData(data: any): any
    }
    
    class HtmlErrorFormatter {
        <<Formatter>>
        -templates: Map~number, string~
        -defaultTemplate: string
        +format(error: Error | ApiError): FormattedError
        +getSupportedFormats(): string[]
        -renderTemplate(template: string, data: any): string
        -getTemplateForError(error: ApiError): string
    }
    
    class ErrorMiddleware {
        <<Middleware>>
        -errorHandlingFacade: ErrorHandlingFacade
        -options: ErrorMiddlewareOptions
        +execute(context: RequestContext, next: NextFunction): Promise~Response~
        -createErrorContext(request: Request, error: Error): ErrorContext
        -errorToResponse(error: Error, context: ErrorContext): Response
        -shouldHandleError(error: Error): boolean
    }
    
    class ErrorBoundary {
        <<Component>>
        -errorHandlingFacade: ErrorHandlingFacade
        -config: ErrorBoundaryConfig
        -onError?: (error: Error, info: any) => void
        +catchError(error: Error, info: any): void
        +renderFallback(error: Error, info: any): React.Element
        +reset(): void
        -logError(error: Error, info: any): void
    }
    
    class GlobalErrorHandler {
        <<Service>>
        -errorHandlingFacade: ErrorHandlingFacade
        -logger: LoggerFacade
        -options: GlobalErrorOptions
        +initialize(): void
        +handleUnhandledRejection(reason: any, promise: Promise<any>): void
        +handleUncaughtException(error: Error): void
        +restoreDefault(): void
        -getErrorReport(error: Error): ErrorReport
        -shouldTerminate(error: Error): boolean
    }
    
    class ErrorLoggerService {
        <<Service>>
        -logger: LoggerFacade
        -config: ErrorLoggerConfig
        -metrics: ErrorMetrics
        +logError(error: Error, context?: ErrorContext): void
        +logWarning(error: Error, context?: ErrorContext): void
        +logCritical(error: Error, context?: ErrorContext): void
        +getRecentErrors(): ErrorLogEntry[]
        +getSeverity(error: Error): ErrorSeverity
        -formatErrorForLogging(error: Error, context?: ErrorContext): Record~string, any~
        -shouldLogStack(error: Error): boolean
    }
    
    class ErrorFactory {
        <<Factory>>
        -errorConfig: ErrorConfig
        -errorTypes: Map~string, typeof ApplicationError~
        +create(code: string, message: string, details?: any): ApplicationError
        +createFromCode(code: string, details?: any): ApplicationError
        +wrap(originalError: Error, code: string, message?: string): ApplicationError
        +registerErrorType(type: string, errorClass: typeof ApplicationError): void
        +getErrorType(type: string): typeof ApplicationError | null
        -getErrorMessage(code: string, defaultMessage?: string): string
        -getErrorConfigForCode(code: string): ErrorTypeConfig | null
    }
    
    class ApplicationError {
        <<Error>>
        +name: string
        +message: string
        +code: string
        +statusCode: number
        +details?: any
        +stack?: string
        +cause?: Error
        +timestamp: Date
        +isOperational: boolean
        +toJSON(): Record~string, any~
        +setStatusCode(code: number): this
        +setDetails(details: any): this
        +setCause(cause: Error): this
        +setOperational(isOperational: boolean): this
    }
    
    class ValidationError {
        <<ApplicationError>>
        +errors: ValidationErrorDetail[]
        +field?: string
        +constraint?: string
        +hasErrors(): boolean
        +addError(field: string, message: string, constraint?: string): this
        +getFieldErrors(field: string): ValidationErrorDetail[]
        +toJSON(): Record~string, any~
    }
    
    class AuthError {
        <<ApplicationError>>
        +userId?: string
        +action?: string
        +setUserId(userId: string): this
        +setAction(action: string): this
        +getErrorCode(): string
    }
    
    class DatabaseError {
        <<ApplicationError>>
        +operation: string
        +collection?: string
        +query?: any
        +setOperation(operation: string): this
        +setCollection(collection: string): this
        +setQuery(query: any): this
        +getErrorCode(): string
    }
    
    class ApiError {
        <<ValueObject>>
        +errorCode: string
        +message: string
        +statusCode: number
        +details?: any
        +errors?: Record~string, string~
        +correlationId?: string
        +timestamp: Date
        +path?: string
        +toJSON(): Record~string, any~
    }
    
    class ErrorContext {
        <<ValueObject>>
        +request?: Request
        +user?: User
        +correlationId?: string
        +source?: string
        +isClient?: boolean
        +metadata?: Record~string, any~
    }
    
    class ErrorResult {
        <<ValueObject>>
        +handled: boolean
        +error: ApiError
        +response?: Response
        +redirect?: string
        +action?: ErrorAction
        +correlationId: string
    }
    
    class FormattedError {
        <<ValueObject>>
        +content: string
        +contentType: string
        +statusCode: number
    }
    
    class ErrorMetrics {
        <<Service>>
        -metricCollector: MetricCollector
        -errorCounts: Map~string, number~
        -errorCountsByType: Map~string, number~
        -errorCountsByStatus: Map~number, number~
        -errorResponseTimes: Map~string, number[]~
        +incrementErrorCount(code: string): void
        +recordErrorTypes(error: Error): void
        +recordStatusCode(statusCode: number): void
        +recordResponseTime(code: string, durationMs: number): void
        +getErrorCounts(): Record~string, number~
        +getErrorCountsByType(): Record~string, number~
        +getErrorCountsByStatus(): Record~number, number~
        +getAverageResponseTime(code: string): number
        +resetMetrics(): void
    }
    
    class ErrorConfig {
        <<Configuration>>
        +defaultMessages: Record~string, string~
        +errorTypes: Record~string, ErrorTypeConfig~
        +statusCodes: Record~string, number~
        +logging: ErrorLoggingConfig
        +errorCodes: Record~string, string~
    }
    
    class ErrorTypeConfig {
        <<Configuration>>
        +message: string
        +statusCode: number
        +logging: boolean
        +logLevel: string
        +isOperational: boolean
        +redactDetails: boolean
    }
    
    class ErrorSeverity {
        <<Enumeration>>
        DEBUG: "debug"
        INFO: "info"
        WARNING: "warning"
        ERROR: "error"
        CRITICAL: "critical"
        FATAL: "fatal"
    }
    
    class ErrorAction {
        <<Enumeration>>
        CONTINUE: "continue"
        RETRY: "retry"
        REDIRECT: "redirect"
        NOTIFY: "notify"
        TERMINATE: "terminate"
    }
    
    %% Relationships
    ErrorHandlingFacade --> ErrorHandlerRegistry : uses
    ErrorHandlingFacade --> ErrorMapperRegistry : uses
    ErrorHandlingFacade --> ErrorFormatterRegistry : uses
    
    ErrorHandlerRegistry --> ErrorHandler : manages
    ErrorMapperRegistry --> ErrorMapper : manages
    ErrorFormatterRegistry --> ErrorFormatter : manages
    
    ValidationErrorHandler --|> ErrorHandler : implements
    DatabaseErrorHandler --|> ErrorHandler : implements
    AuthErrorHandler --|> ErrorHandler : implements
    
    HttpErrorMapper --|> ErrorMapper : implements
    
    JsonErrorFormatter --|> ErrorFormatter : implements
    HtmlErrorFormatter --|> ErrorFormatter : implements
    
    ErrorMiddleware --> ErrorHandlingFacade : uses
    ErrorBoundary --> ErrorHandlingFacade : uses
    GlobalErrorHandler --> ErrorHandlingFacade : uses
    
    ErrorLoggerService --> ErrorMetrics : tracks metrics via
    
    ErrorFactory --> ApplicationError : creates
    
    ValidationError --|> ApplicationError : extends
    AuthError --|> ApplicationError : extends
    DatabaseError --|> ApplicationError : extends
    
    ErrorHandler --> ErrorResult : produces
    ErrorMapper --> ApiError : produces
    ErrorFormatter --> FormattedError : produces
    
    ErrorResult --> ApiError : contains
    ErrorContext --> Request : may reference
    
    ErrorHandlingFacade --> ErrorFactory : uses to create errors```

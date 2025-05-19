```mermaid
classDiagram
    %% Internationalization (i18n) System Architecture
    
    class TranslationFacade {
        <<Facade>>
        -translationService: TranslationService
        -localeProvider: LocaleProvider
        -configService: ConfigService
        -cacheFacade: CacheFacade
        +translate(key: string, params: object): string
        +translatePlural(key: string, count: number, params: object): string
        +formatDate(date: Date, options: object): string
        +formatTime(date: Date, options: object): string
        +formatNumber(value: number, options: object): string
        +formatCurrency(value: number, currency: string, options: object): string
        +getLocale(): Locale
        +changeLocale(locale: string): Promise
        +getAvailableLocales(): Locale[]
        +getNegotiatedLocale(acceptLanguage: string): string
        +translateWithFallback(key: string, fallback: string, params: object): string
    }
    
    class TranslationService {
        <<Service>>
        -messageStore: MessageStore
        -localeProvider: LocaleProvider
        -formatters: Map
        -translationCache: TranslationCache
        -config: TranslationConfig
        -eventMediator: EventMediator
        +initialize(): Promise
        +translate(key: string, params: object, locale: string): string
        +translatePlural(key: string, count: number, params: object, locale: string): string
        +format(value: any, type: string, options: object, locale: string): string
        +loadMessages(locale: string): Promise
        +getMissingKeys(): string[]
        +hasTranslation(key: string, locale: string): boolean
        -interpolate(message: string, params: object): string
        -getCachedTranslation(key: string, locale: string): string|null
        -handleMissingTranslation(key: string, locale: string): string
    }
    
    class LocaleProvider {
        <<Service>>
        -currentLocale: string
        -fallbackLocale: string
        -supportedLocales: Map
        -storage: Storage
        -storageKey: string
        -eventMediator: EventMediator
        +getCurrentLocale(): string
        +setCurrentLocale(locale: string): Promise
        +getFallbackLocale(): string
        +getSupportedLocales(): Locale[]
        +isLocaleSupported(locale: string): boolean
        +negotiateLocale(acceptLanguage: string): string
        +getLocaleFromStorage(): string|null
        +saveLocaleToStorage(locale: string): void
        +getLocaleInfo(locale: string): Locale|null
        -normalizeLocale(locale: string): string
        -emitLocaleChangeEvent(oldLocale: string, newLocale: string): void
    }
    
    class MessageStore {
        <<Repository>>
        -messages: Map
        -pluralRules: Map
        -loadedLocales: Set
        -loaders: Map
        -eventMediator: EventMediator
        +getMessages(locale: string): object
        +getMessage(key: string, locale: string): string|null
        +hasLocale(locale: string): boolean
        +hasMessage(key: string, locale: string): boolean
        +loadLocale(locale: string): Promise
        +registerLoader(id: string, loader: MessageLoader): void
        +getHierarchicalValue(messages: object, key: string): string|null
        +getPluralForm(locale: string, count: number): string
        -mergeMessages(target: object, source: object): object
    }
    
    class MessageLoader {
        <<Interface>>
        +load(locale: string): Promise
        +getAvailableLocales(): Promise
        +getId(): string
    }
    
    class FileMessageLoader {
        <<Loader>>
        -fs: FileSystem
        -basePath: string
        -filePattern: string
        -fileExtension: string
        -cache: boolean
        +load(locale: string): Promise
        +getAvailableLocales(): Promise
        +getId(): string
        -getFilePath(locale: string): string
        -parseMessageFile(content: string, extension: string): object
    }
    
    class RemoteMessageLoader {
        <<Loader>>
        -apiClient: ApiClient
        -endpoint: string
        -apiKey: string
        -cacheManager: CacheManager
        -retryStrategy: RetryStrategy
        +load(locale: string): Promise
        +getAvailableLocales(): Promise
        +getId(): string
        -fetchRemoteMessages(locale: string): Promise
        -handleApiError(error: Error, locale: string): void
    }
    
    class MessageBundleCompiler {
        <<Utility>>
        +compile(messages: object): CompiledMessages
        +decompile(compiled: CompiledMessages): object
        +optimize(messages: object): object
        +flattenHierarchical(messages: object): object
        +extractKeys(messages: object): string[]
    }
    
    class Formatter {
        <<Interface>>
        +format(value: any, options: object, locale: string): string
        +getType(): string
    }
    
    class DateTimeFormatter {
        <<Formatter>>
        -intlFormatter: Intl.DateTimeFormat
        -formatCache: Map
        +format(value: Date, options: object, locale: string): string
        +getType(): string
        -getCachedFormatter(locale: string, options: object): Intl.DateTimeFormat
        -buildCacheKey(locale: string, options: object): string
    }
    
    class NumberFormatter {
        <<Formatter>>
        -intlFormatter: Intl.NumberFormat
        -formatCache: Map
        +format(value: number, options: object, locale: string): string
        +getType(): string
        -getCachedFormatter(locale: string, options: object): Intl.NumberFormat
        -buildCacheKey(locale: string, options: object): string
    }
    
    class TranslationCache {
        <<Service>>
        -cache: Map
        -cacheHitCount: number
        -cacheMissCount: number
        -maxEntries: number
        +get(key: string, locale: string): string|null
        +set(key: string, locale: string, value: string): void
        +invalidate(key: string, locale: string): void
        +getStats(): CacheStats
        +setMaxEntries(max: number): void
        -buildCacheKey(key: string, locale: string): string
        -evictIfNeeded(): void
    }
    
    class TranslationMiddleware {
        <<Middleware>>
        -translationFacade: TranslationFacade
        +execute(request: Request, next: NextFunction): Promise
        -detectLocale(request: Request): string
        -setResponseHeaders(response: Response, locale: string): Response
        -trackMissingTranslations(request: Request): void
    }
    
    class LocaleDetector {
        <<Service>>
        -strategies: Map
        -strategyOrder: string[]
        +detectLocale(request: Request): string
        +registerStrategy(name: string, strategy: DetectionStrategy): void
        +setStrategyOrder(order: string[]): void
        -executeStrategies(request: Request): string|null
    }
    
    class DetectionStrategy {
        <<Interface>>
        +detect(request: Request): string|null
        +getPriority(): number
    }
    
    class HeaderStrategy {
        <<Strategy>>
        -localeProvider: LocaleProvider
        +detect(request: Request): string|null
        +getPriority(): number
        -parseAcceptLanguage(header: string): object[]
    }
    
    class QueryParamStrategy {
        <<Strategy>>
        -paramName: string
        -localeProvider: LocaleProvider
        +detect(request: Request): string|null
        +getPriority(): number
    }
    
    class CookieStrategy {
        <<Strategy>>
        -cookieName: string
        -localeProvider: LocaleProvider
        +detect(request: Request): string|null
        +getPriority(): number
    }
    
    class Locale {
        <<ValueObject>>
        +code: string
        +name: string
        +nativeName: string
        +direction: string
        +region: string
        +script: string
        +parentLocale: string
        +formatters: object
    }
    
    class CompiledMessages {
        <<ValueObject>>
        +locale: string
        +messages: object
        +pluralForms: object
        +metadata: MessageMetadata
    }
    
    class FormatOptions {
        <<ValueObject>>
        +type: string
        +style: string
        +pattern: string
    }
    
    class TranslationConfig {
        <<Configuration>>
        +defaultLocale: string
        +fallbackLocale: string
        +supportedLocales: string[]
        +storageKey: string
        +interpolation: InterpolationConfig
        +formatting: FormattingConfig
        +loaders: LoaderConfig[]
        +caching: CachingConfig
        +missingTranslation: string
    }
    
    %% Relationships
    TranslationFacade --> TranslationService : uses
    TranslationFacade --> LocaleProvider : uses
    TranslationFacade --> CacheFacade : uses for caching
    
    TranslationService --> MessageStore : uses
    TranslationService --> LocaleProvider : uses
    TranslationService --> TranslationCache : uses
    
    MessageStore --> MessageLoader : uses
    
    FileMessageLoader --|> MessageLoader : implements
    RemoteMessageLoader --|> MessageLoader : implements
    
    DateTimeFormatter --|> Formatter : implements
    NumberFormatter --|> Formatter : implements
    
    LocaleDetector --> DetectionStrategy : uses
    
    HeaderStrategy --|> DetectionStrategy : implements
    QueryParamStrategy --|> DetectionStrategy : implements
    CookieStrategy --|> DetectionStrategy : implements
    
    TranslationMiddleware --> TranslationFacade : uses
    TranslationMiddleware --> LocaleDetector : uses
    
    MessageStore --> CompiledMessages : manages
    TranslationService --> Locale : uses```

```mermaid
classDiagram
    %% Theme Management Pattern
    
    class ThemeManager {
        <<Singleton>>
        -static instance: ThemeManager
        -themes: Map~ThemeName, Theme~
        -currentTheme: ThemeName
        -listeners: Set~ThemeChangeListener~
        +static getInstance(): ThemeManager
        +registerTheme(theme: Theme): void
        +getTheme(name: ThemeName): Theme
        +getCurrentTheme(): Theme
        +setTheme(name: ThemeName): void
        +getAllThemes(): Theme[]
        +subscribe(listener: ThemeChangeListener): () => void
    }
    
    class Theme {
        <<Interface>>
        +name: ThemeName
        +displayName: string
        +colors: ThemeColors
        +getColorValue(path: string): string
    }
    
    class ThemeColors {
        +backgrounds: BackgroundColors
        +text: TextColors
        +borders: BorderColors
        +buttons: ButtonColors
        +inputs: InputColors
        +cards: CardColors
        +navigation: NavigationColors
        +features: FeatureColors
        +status: StatusColors
    }
    
    class ThemeFactory {
        <<Static>>
        +createTheme(config: ThemeColorConfig): Theme
        +extendTheme(baseTheme: Theme, overrides: Partial~ThemeColorConfig~): Theme
        +createEmptyTheme(): Theme
    }
    
    class ThemeColorConfig {
        +name: ThemeName
        +displayName: string
        +backgrounds: Record~string, string~
        +text: Record~string, string~
        +borders: Record~string, string~
        +buttons: Record~string, string~
        +inputs: Record~string, string~
        +cards: Record~string, string~
        +navigation: Record~string, string~
        +features: Record~string, string~
        +status: Record~string, string~
    }
    
    class ThemeContext {
        -theme: Theme
        -setTheme: (theme: ThemeName) => void
        +Provider: React.Component
        +Consumer: React.Component
        +useTheme(): [Theme, (theme: ThemeName) => void]
    }
    
    class ThemeRegistry {
        <<Singleton>>
        -themes: Map~ThemeName, () => Promise~Theme~~
        +register(name: ThemeName, loader: () => Promise~Theme~): void
        +getThemeLoader(name: ThemeName): () => Promise~Theme~
        +getRegisteredThemes(): ThemeName[]
        +registerDefaultThemes(): void
    }
    
    class LazyThemeLoader {
        <<Static>>
        +loadTheme(name: ThemeName): Promise~Theme~
        +preloadThemes(names: ThemeName[]): Promise~void~
    }
    
    %% Concrete implementations
    class DefaultTheme {
        +name: ThemeName.Default
        +displayName: string
        +colors: ThemeColors
        +getColorValue(path: string): string
    }
    
    class EmeraldTheme {
        +name: ThemeName.Emerald
        +displayName: string
        +colors: ThemeColors
        +getColorValue(path: string): string
    }
    
    class ThemeService {
        -themeManager: ThemeManager
        -storage: Storage
        -storageKey: string = "app-theme"
        +initialize(): Promise~void~
        +changeTheme(name: ThemeName): void
        +getSavedTheme(): ThemeName
        +saveTheme(name: ThemeName): void
    }
    
    class ThemeHelpers {
        <<Static>>
        +getThemeProperty(theme: Theme, path: string): string
        +contrastTextColor(backgroundColor: string): string
        +isLightColor(color: string): boolean
        +generateCssVariables(theme: Theme): string
        +getThemeClasses(theme: Theme, component: string, variant?: string): string
    }
    
    %% Relationships
    ThemeManager o-- Theme : manages
    Theme *-- ThemeColors : contains
    
    DefaultTheme ..|> Theme : implements
    EmeraldTheme ..|> Theme : implements
    
    ThemeFactory ..> Theme : creates
    ThemeFactory ..> ThemeColorConfig : uses
    
    ThemeRegistry ..> LazyThemeLoader : uses
    ThemeManager --> ThemeRegistry : uses
    
    ThemeService --> ThemeManager : uses
    
    ThemeContext --> ThemeManager : consumes
    
    ThemeHelpers ..> Theme : utility for```

```mermaid
classDiagram
    %% Constants Registry Pattern
    
    class ConstantsRegistry {
        <<Singleton>>
        -static instance: ConstantsRegistry
        -registeredModules: Map~string, ConstantsModule~
        +static getInstance(): ConstantsRegistry
        +register(module: ConstantsModule): void
        +get~T~(moduleId: string): T
        +getAll(): Record~string, any~
    }
    
    class ConstantsModule {
        <<Interface>>
        +id: string
        +constants: any
        +getConstants(): any
    }
    
    class ExerciseConstants {
        +id: string = "exercise"
        +constants: Record~string, any~
        +EXERCISE_TYPES: ExerciseType[]
        +PROGRESSION_METHODS: ProgressionMethod[]
        +getConstants(): Record~string, any~
        +getExerciseTypeOptions(): SelectOption[]
    }
    
    class OrganizationConstants {
        +id: string = "organization"
        +constants: Record~string, any~
        +ORGANIZATION_TYPES: OrganizationType[]
        +ORGANIZATION_ROLES: OrganizationRole[]
        +getConstants(): Record~string, any~
        +getRoleLabel(role: OrganizationRole): string
    }
    
    class MuscleConstants {
        +id: string = "muscle"
        +constants: Record~string, any~
        +MUSCLE_GROUPS: Map~MuscleZone, MuscleData[]~
        +getConstants(): Record~string, any~
        +getMusclesByZone(zone: MuscleZone): MuscleData[]
        +getMuscleById(id: string): MuscleData | null
    }
    
    class ThemeConstants {
        +id: string = "theme"
        +constants: Record~string, any~
        +THEME_NAMES: ThemeName[]
        +DEFAULT_THEME: ThemeName
        +getConstants(): Record~string, any~
        +isValidTheme(theme: string): boolean
    }
    
    class PermissionConstants {
        +id: string = "permission"
        +constants: Record~string, any~
        +getConstants(): Record~string, any~
        +getUserPermissions(role: UserRole): string[]
        +hasPermission(role: UserRole, permission: string): boolean
    }
    
    class LazyLoadedModule {
        <<Abstract>>
        +id: string
        -loaded: boolean
        -constantsData: any
        +getConstants(): any
        #loadConstants(): Promise~any~
    }
    
    class ConstantsSelector {
        <<Utility>>
        +static exercise: ExerciseConstants
        +static organization: OrganizationConstants
        +static muscle: MuscleConstants
        +static theme: ThemeConstants
        +static permission: PermissionConstants
        +static select~T~(moduleId: string): T
    }
    
    %% Relationships
    ConstantsRegistry o-- ConstantsModule : contains
    ExerciseConstants ..|> ConstantsModule : implements
    OrganizationConstants ..|> ConstantsModule : implements
    MuscleConstants ..|> ConstantsModule : implements
    ThemeConstants ..|> ConstantsModule : implements
    PermissionConstants ..|> ConstantsModule : implements
    LazyLoadedModule ..|> ConstantsModule : implements
    ConstantsSelector --> ConstantsRegistry : uses```

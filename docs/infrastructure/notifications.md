# Notification System
```mermaid
erDiagram
    NOTIFICATION_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NULLABLE LENGTH 500"
        ENUM category "NOT NULL"
        ENUM priority "NOT NULL"
        BOOLEAN is_user_configurable "NOT NULL DEFAULT true"
        BOOLEAN requires_action "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    NOTIFICATION_TEMPLATE {
        UUID id PK
        UUID notification_type_id FK "NOT NULL"
        ENUM channel "NOT NULL"
        VARCHAR(255) subject_template "NULLABLE"
        TEXT body_template "NOT NULL LENGTH 2000"
        TEXT action_url_template "NULLABLE LENGTH 500"
        VARCHAR(100) action_button_text "NULLABLE"
        JSONB template_variables "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    NOTIFICATION_STATUS {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 500"
        BOOLEAN is_final_status "NOT NULL DEFAULT false"
        BOOLEAN indicates_success "NOT NULL DEFAULT true"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    NOTIFICATION {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID notification_type_id FK "NOT NULL"
        VARCHAR(255) title "NOT NULL"
        TEXT message "NOT NULL LENGTH 2000"
        TEXT action_url "NULLABLE LENGTH 500"
        VARCHAR(100) action_button_text "NULLABLE"
        JSONB metadata "NULLABLE"
        UUID status_id FK "NOT NULL"
        TIMESTAMP scheduled_for "NULLABLE"
        TIMESTAMP sent_at "NULLABLE"
        TIMESTAMP read_at "NULLABLE"
        TIMESTAMP clicked_at "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER_NOTIFICATION_PREFERENCE {
        UUID user_id PK FK "NOT NULL"
        UUID notification_type_id PK FK "NOT NULL"
        ENUM channel PK "NOT NULL"
        BOOLEAN is_enabled "NOT NULL DEFAULT true"
        JSONB settings "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    DELIVERY_STATUS {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 500"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    NOTIFICATION_DELIVERY {
        UUID id PK
        UUID notification_id FK "NOT NULL"
        ENUM channel "NOT NULL"
        UUID delivery_status_id FK "NOT NULL"
        VARCHAR(255) external_id "NULLABLE"
        TEXT failure_reason "NULLABLE LENGTH 1000"
        SMALLINT retry_count "NOT NULL DEFAULT 0"
        TIMESTAMP sent_at "NULLABLE"
        TIMESTAMP delivered_at "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_NOTIFICATION {
        UUID id PK
        UUID activity_id FK "NOT NULL"
        UUID recipient_id FK "NOT NULL"
        UUID notification_type_id FK "NOT NULL"
        TEXT message "NOT NULL LENGTH 2000"
        BOOLEAN is_read "NOT NULL DEFAULT false"
        TIMESTAMP sent_at "NOT NULL DEFAULT now()"
        TIMESTAMP read_at "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    NOTIFICATION_TYPE ||--o{ NOTIFICATION_TEMPLATE : "templates"
    NOTIFICATION_TYPE ||--o{ NOTIFICATION : "instances"
    NOTIFICATION_TYPE ||--o{ USER_NOTIFICATION_PREFERENCE : "preferences"
    NOTIFICATION_TYPE ||--o{ ACTIVITY_NOTIFICATION : "activity_notifications"
    USER ||--o{ NOTIFICATION : "notifications"
    USER ||--o{ USER_NOTIFICATION_PREFERENCE : "preferences"
    NOTIFICATION }|--|| NOTIFICATION_STATUS : "status"
    NOTIFICATION ||--o{ NOTIFICATION_DELIVERY : "deliveries"
    NOTIFICATION_DELIVERY }|--|| DELIVERY_STATUS : "delivery_status"
    ACTIVITY_NOTIFICATION }|--|| USER : "recipient"
    ACTIVITY_NOTIFICATION }|--|| ACTIVITY : "activity"
```


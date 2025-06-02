# Event Bus & Integration Tracking

**Section:** Audit & Events
**Subsection:** Event Bus & Integration Tracking

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Event Bus & Integration Tracking ===%%

  EVENT_QUEUE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID event_id FK                   "NOT NULL; references SYSTEM_EVENT.id"
    VARCHAR(100) topic                 "NOT NULL; event bus topic"
    JSONB payload                      "NOT NULL; message payload"
    ENUM status                        "NOT NULL; PENDING, PROCESSING, COMPLETED, FAILED"
    INT retry_count                    "NOT NULL; DEFAULT 0"
    INT max_retries                    "NOT NULL; DEFAULT 3"
    TIMESTAMP next_retry_at            "NULLABLE"
    TEXT failure_reason                "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP processed_at             "NULLABLE"
  }

  EVENT_SUBSCRIPTION {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) subscriber_name       "NOT NULL"
    VARCHAR(100) topic_pattern         "NOT NULL; topic subscription pattern"
    VARCHAR(500) webhook_url           "NULLABLE; for webhook subscribers"
    VARCHAR(100) callback_method       "NULLABLE; internal method name"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    JSONB subscription_config          "NULLABLE; subscriber-specific config"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  INTEGRATION_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) integration_name      "NOT NULL; STRIPE, PAYPAL, EMAIL_PROVIDER"
    ENUM operation                     "NOT NULL; WEBHOOK_RECEIVED, API_CALL_MADE, DATA_SYNC"
    VARCHAR external_id                "NULLABLE; external system ID"
    JSONB request_data                 "NULLABLE"
    JSONB response_data                "NULLABLE"
    INT http_status_code               "NULLABLE"
    BOOLEAN success                    "NOT NULL"
    TEXT error_message                 "NULLABLE"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
  }

  SECURITY_EVENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id"
    ENUM event_type                    "NOT NULL; FAILED_LOGIN, SUSPICIOUS_ACTIVITY, PERMISSION_DENIED"
    ENUM severity                      "NOT NULL; LOW, MEDIUM, HIGH, CRITICAL"
    VARCHAR(45) ip_address             "NOT NULL"
    VARCHAR(500) user_agent            "NULLABLE"
    JSONB event_details                "NOT NULL; specific security event data"
    BOOLEAN requires_review            "NOT NULL; DEFAULT false"
    UUID reviewed_by FK                "NULLABLE; references USER.id"
    TIMESTAMP reviewed_at              "NULLABLE"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 2 —
  SYSTEM_EVENT ||--o{ EVENT_QUEUE     : "queued for processing"
  EVENT_SUBSCRIPTION ||--o{ EVENT_QUEUE : "processes events"
  USER ||--o{ SECURITY_EVENT          : "security events"
  USER ||--o{ SECURITY_EVENT          : "reviews events"

```

## Notes

This diagram represents the event bus & integration tracking structure and relationships within the audit & events domain.

---
*Generated from diagram extraction script*

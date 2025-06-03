# Core "Payment" Definition & Subscription Management

**Section:** Payment
**Subsection:** Core "Payment" Definition & Subscription Management

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Payment & Subscription ===%%

  BILLING_PLAN {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) name                  "NOT NULL; UNIQUE"
    TEXT description                   "NULLABLE"
    DECIMAL price                      "NOT NULL; base price"
    VARCHAR(3) currency                "NOT NULL; ISO currency code"
    ENUM billing_cycle                 "NOT NULL; MONTHLY, YEARLY, LIFETIME"
    INT trial_days                     "NOT NULL; DEFAULT 0"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    JSONB features                     "NOT NULL; what's included in this plan"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  SUBSCRIPTION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID billing_plan_id FK            "NOT NULL; references BILLING_PLAN.id"
    UUID subscription_status_id FK     "NOT NULL; references SUBSCRIPTION_STATUS.id"
    DATE started_at                    "NOT NULL"
    DATE current_period_start          "NOT NULL"
    DATE current_period_end            "NOT NULL"
    DATE trial_end                     "NULLABLE"
    DATE cancelled_at                  "NULLABLE"
    DATE ended_at                      "NULLABLE"
    TEXT cancellation_reason           "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  SUBSCRIPTION_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; TRIALING, ACTIVE, PAST_DUE, CANCELLED, UNPAID"
    TEXT description                   "NULLABLE"
  }

  PAYMENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID subscription_id FK            "NOT NULL; references SUBSCRIPTION.id"
    VARCHAR external_payment_id        "NOT NULL; UNIQUE; from payment processor"
    ENUM payment_provider              "NOT NULL; STRIPE, PAYPAL, etc."
    DECIMAL amount                     "NOT NULL"
    VARCHAR(3) currency                "NOT NULL"
    UUID payment_status_id FK          "NOT NULL; references PAYMENT_STATUS.id"
    TIMESTAMP processed_at             "NULLABLE"
    TIMESTAMP failed_at                "NULLABLE"
    TEXT failure_reason                "NULLABLE"
    JSONB provider_data                "NULLABLE; webhook/response data"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  PAYMENT_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; PENDING, SUCCEEDED, FAILED, REFUNDED"
    TEXT description                   "NULLABLE"
  }

  %%— Relationships in Layer 1 —
  SUBSCRIPTION ||--|| BILLING_PLAN        : "plan lookup"
  SUBSCRIPTION ||--|| SUBSCRIPTION_STATUS : "status lookup"
  SUBSCRIPTION ||--o{ PAYMENT             : "has payments"
  PAYMENT ||--|| PAYMENT_STATUS           : "status lookup"
  USER ||--o{ SUBSCRIPTION                : "has subscriptions"

```

## Notes

This diagram represents the core "payment" definition & subscription management structure and relationships within the payment domain.

---
*Generated from diagram extraction script*

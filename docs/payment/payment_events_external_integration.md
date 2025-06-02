# Payment Events & External Integration

**Section:** Payment
**Subsection:** Payment Events & External Integration

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Payment Events & External Integration ===%%

  PAYMENT_WEBHOOK {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID payment_id FK                 "NULLABLE; references PAYMENT.id"
    VARCHAR external_event_id          "NOT NULL; UNIQUE; from payment processor"
    ENUM event_type                    "NOT NULL; PAYMENT_SUCCEEDED, PAYMENT_FAILED, SUBSCRIPTION_CANCELLED, etc."
    ENUM provider                      "NOT NULL; STRIPE, PAYPAL"
    JSONB raw_payload                  "NOT NULL; full webhook data"
    BOOLEAN processed                  "NOT NULL; DEFAULT false"
    TIMESTAMP processed_at             "NULLABLE"
    TEXT processing_error              "NULLABLE"
    TIMESTAMP received_at              "NOT NULL; DEFAULT now()"
  }

  PAYMENT_METHOD {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR external_method_id         "NOT NULL; payment processor ID"
    ENUM provider                      "NOT NULL; STRIPE, PAYPAL"
    ENUM method_type                   "NOT NULL; CARD, PAYPAL_ACCOUNT, BANK_ACCOUNT"
    VARCHAR last_four                  "NULLABLE; last 4 digits for cards"
    VARCHAR brand                      "NULLABLE; VISA, MASTERCARD, etc."
    DATE expires_at                    "NULLABLE; for cards"
    BOOLEAN is_default                 "NOT NULL; DEFAULT false"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  SUBSCRIPTION_CHANGE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID subscription_id FK            "NOT NULL; references SUBSCRIPTION.id"
    UUID from_plan_id FK               "NULLABLE; references BILLING_PLAN.id"
    UUID to_plan_id FK                 "NOT NULL; references BILLING_PLAN.id"
    ENUM change_type                   "NOT NULL; UPGRADE, DOWNGRADE, PLAN_CHANGE"
    DATE effective_date                "NOT NULL"
    DECIMAL proration_amount           "NULLABLE"
    TEXT reason                        "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 2 —
  PAYMENT ||--o{ PAYMENT_WEBHOOK      : "triggered webhooks"
  USER ||--o{ PAYMENT_METHOD          : "saved payment methods"
  SUBSCRIPTION ||--o{ SUBSCRIPTION_CHANGE : "plan changes"
  SUBSCRIPTION_CHANGE }|--|| BILLING_PLAN : "from plan"
  SUBSCRIPTION_CHANGE }|--|| BILLING_PLAN : "to plan"

```

## Notes

This diagram represents the payment events & external integration structure and relationships within the payment domain.

---
*Generated from diagram extraction script*

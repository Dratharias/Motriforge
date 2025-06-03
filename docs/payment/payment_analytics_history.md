# Payment Analytics & History

**Section:** Payment
**Subsection:** Payment Analytics & History

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Payment Analytics & History ===%%

  INVOICE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID subscription_id FK            "NOT NULL; references SUBSCRIPTION.id"
    VARCHAR invoice_number             "NOT NULL; UNIQUE"
    VARCHAR external_invoice_id        "NULLABLE; from payment processor"
    DECIMAL subtotal                   "NOT NULL"
    DECIMAL tax_amount                 "NOT NULL; DEFAULT 0"
    DECIMAL total                      "NOT NULL"
    VARCHAR(3) currency                "NOT NULL"
    DATE due_date                      "NOT NULL"
    DATE paid_date                     "NULLABLE"
    UUID invoice_status_id FK          "NOT NULL; references INVOICE_STATUS.id"
    JSONB line_items                   "NOT NULL; invoice details"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  INVOICE_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE"
    TEXT description                   "NULLABLE"
  }

  PAYMENT_REFUND {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID payment_id FK                 "NOT NULL; references PAYMENT.id"
    VARCHAR external_refund_id         "NOT NULL; UNIQUE"
    DECIMAL amount                     "NOT NULL"
    VARCHAR(3) currency                "NOT NULL"
    TEXT reason                        "NULLABLE"
    UUID refund_status_id FK           "NOT NULL; references REFUND_STATUS.id"
    TIMESTAMP processed_at             "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  REFUND_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; PENDING, SUCCEEDED, FAILED, CANCELLED"
    TEXT description                   "NULLABLE"
  }

  %%— Relationships in Layer 3 —
  SUBSCRIPTION ||--o{ INVOICE         : "generates invoices"
  INVOICE ||--|| INVOICE_STATUS       : "status lookup"
  PAYMENT ||--o{ PAYMENT_REFUND       : "can be refunded"
  PAYMENT_REFUND ||--|| REFUND_STATUS : "status lookup"

```

## Notes

This diagram represents the payment analytics & history structure and relationships within the payment domain.

---
*Generated from diagram extraction script*

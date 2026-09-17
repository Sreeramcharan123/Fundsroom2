# FundsRoom ER Diagram

The following Mermaid ER diagram represents the relational model
required by the technical case study.

> If the existing implementation uses different table/model names,
> update this diagram after the final Prisma schema is confirmed.

``` mermaid
erDiagram

    USER {
        int id PK
        string name
        string email UK
        string passwordHash
        enum role
        datetime createdAt
    }

    CUSTOMER {
        int id PK
        string companyName
        string contactPerson
        string mobile
        string email
        string city
        datetime createdAt
    }

    PRODUCT {
        int id PK
        string productCode UK
        string productName
        string category
        string unit
        decimal basePrice
    }

    INVENTORY {
        int id PK
        int productId FK,UK
        int physicalQty
        int reservedQty
        datetime updatedAt
    }

    ENQUIRY {
        int id PK
        string enquiryNo UK
        int customerId FK
        int createdById FK
        date enquiryDate
        date requiredDate
        string notes
        enum status
    }

    ENQUIRY_ITEM {
        int id PK
        int enquiryId FK
        int productId FK
        int quantity
    }

    QUOTATION {
        int id PK
        string quotationNo UK
        int enquiryId FK,UK
        int customerId FK
        int createdById FK
        date validUntil
        decimal subtotal
        decimal discountAmount
        decimal gstAmount
        decimal grandTotal
        enum status
    }

    QUOTATION_ITEM {
        int id PK
        int quotationId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal discountPct
        decimal gstPct
        decimal lineAmount
    }

    SALES_ORDER {
        int id PK
        string orderNo UK
        int quotationId FK,UK
        int customerId FK
        date orderDate
        decimal totalAmount
        enum status
    }

    SALES_ORDER_ITEM {
        int id PK
        int salesOrderId FK
        int productId FK
        int quantity
        decimal unitPrice
    }

    DISPATCH {
        int id PK
        string dispatchNo UK
        int salesOrderId FK,UK
        date dispatchDate
        string vehicleNo
        string driverName
    }

    USER ||--o{ ENQUIRY : creates
    USER ||--o{ QUOTATION : creates

    CUSTOMER ||--o{ ENQUIRY : has
    CUSTOMER ||--o{ QUOTATION : has
    CUSTOMER ||--o{ SALES_ORDER : has

    PRODUCT ||--o| INVENTORY : has

    ENQUIRY ||--|{ ENQUIRY_ITEM : contains
    PRODUCT ||--o{ ENQUIRY_ITEM : requested

    ENQUIRY ||--o| QUOTATION : generates
    QUOTATION ||--|{ QUOTATION_ITEM : contains
    PRODUCT ||--o{ QUOTATION_ITEM : quoted

    QUOTATION ||--o| SALES_ORDER : converts_to
    SALES_ORDER ||--|{ SALES_ORDER_ITEM : contains
    PRODUCT ||--o{ SALES_ORDER_ITEM : ordered

    SALES_ORDER ||--o| DISPATCH : has
```

## Workflow Relationships

``` text
CUSTOMER
   │
   └── ENQUIRY
         │
         └── QUOTATION
               │
               └── SALES ORDER
                     │
                     └── DISPATCH

PRODUCT
   │
   ├── ENQUIRY ITEM
   ├── QUOTATION ITEM
   ├── SALES ORDER ITEM
   └── INVENTORY
```

## Inventory Formula

``` text
Available Quantity = Physical Quantity - Reserved Quantity
```

Reservation changes:

``` text
Reserved Quantity ↑
Physical Quantity unchanged
```

Dispatch changes:

``` text
Physical Quantity ↓
Reserved Quantity ↓
```

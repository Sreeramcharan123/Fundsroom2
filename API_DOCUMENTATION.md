# FundsRoom API Documentation

## Base URL

``` text
http://localhost:5000
```

Use the deployed backend URL instead when running the deployed
application.

> Endpoint prefixes may be adapted to the existing FundsRoom route
> structure. The following endpoints represent the required case-study
> API functionality.

## Authentication

### POST `/auth/login`

Authenticate a user and return a JWT.

#### Request

``` json
{
  "email": "sales@example.com",
  "password": "password"
}
```

#### Response

``` json
{
  "token": "<JWT_TOKEN>",
  "user": {
    "id": 1,
    "name": "Sales User",
    "role": "SALES_USER"
  }
}
```

For protected endpoints:

``` text
Authorization: Bearer <JWT_TOKEN>
```

------------------------------------------------------------------------

# Enquiries

## POST `/enquiries`

Create a customer enquiry.

### SALES_USER

#### Example Request

``` json
{
  "customerId": 1,
  "enquiryDate": "2026-09-17",
  "requiredDate": "2026-10-01",
  "notes": "Industrial product requirement",
  "items": [
    {
      "productId": 1,
      "quantity": 100
    },
    {
      "productId": 2,
      "quantity": 40
    }
  ]
}
```

### Expected behavior

-   Creates an enquiry number.
-   Creates one or more enquiry items.
-   Initial status is `NEW`.
-   Quantities must be positive.

------------------------------------------------------------------------

## GET `/enquiries`

Return enquiries available to the authenticated user according to the
application's authorization rules.

Example response:

``` json
[
  {
    "id": 1,
    "enquiryNo": "ENQ-0001",
    "status": "NEW",
    "customer": {
      "id": 1,
      "companyName": "ABC Engineering Pvt. Ltd."
    },
    "items": [
      {
        "productId": 1,
        "quantity": 100
      }
    ]
  }
]
```

------------------------------------------------------------------------

# Quotations

## POST `/quotations`

Create a quotation against an enquiry.

### SALES_USER

Example request:

``` json
{
  "enquiryId": 1,
  "validUntil": "2026-10-01",
  "items": [
    {
      "productId": 1,
      "quantity": 100,
      "unitPrice": 1250,
      "discountPct": 5,
      "gstPct": 18
    }
  ]
}
```

### Backend calculation

For every item:

``` text
Base Amount = Quantity × Unit Price
```

Discount and GST are applied by the backend.

The client must not be trusted to supply the final grand total.

------------------------------------------------------------------------

## PATCH `/quotations/:id/status`

Update quotation status.

Allowed workflow:

``` text
DRAFT → SENT → ACCEPTED
                    ↘ REJECTED
```

Example:

``` json
{
  "status": "ACCEPTED"
}
```

Only valid status transitions should be accepted by the backend.

------------------------------------------------------------------------

## POST `/quotations/:id/convert`

Convert an accepted quotation into a Sales Order.

### Rules

Allowed:

``` text
ACCEPTED → Sales Order
```

Rejected:

``` text
DRAFT → 400/validation error
REJECTED → 400/validation error
```

The database must enforce one Sales Order per quotation.

Example response:

``` json
{
  "message": "Sales Order created successfully",
  "salesOrder": {
    "id": 1,
    "orderNo": "SO-0001",
    "status": "PENDING"
  }
}
```

------------------------------------------------------------------------

# Sales Orders

## GET `/sales-orders`

Return Sales Orders with customer, quotation, products and relevant
inventory availability.

Example response:

``` json
[
  {
    "id": 1,
    "orderNo": "SO-0001",
    "status": "PENDING",
    "totalAmount": 141600,
    "customer": {
      "companyName": "ABC Engineering Pvt. Ltd."
    },
    "items": [
      {
        "productId": 1,
        "quantity": 100,
        "availableQuantity": 250
      }
    ]
  }
]
```

------------------------------------------------------------------------

## POST `/sales-orders/:id/confirm`

### ADMIN only

Confirm the Sales Order and reserve inventory.

### Required behavior

1.  Begin a PostgreSQL transaction.
2.  Lock/check the relevant inventory rows.
3.  Calculate available quantity.
4.  Reject if requested quantity exceeds available quantity.
5.  Increase reserved quantity.
6.  Keep physical quantity unchanged.
7.  Mark the Sales Order `CONFIRMED`.
8.  Commit the transaction.

Example:

``` text
Physical = 200
Reserved = 60
Available = 140

Requirement = 80

After:
Physical = 200
Reserved = 140
Available = 60
```

If availability is insufficient, no partial reservation should be
committed unless the application explicitly implements partial
fulfillment.

------------------------------------------------------------------------

# Dispatch

## POST `/sales-orders/:id/dispatch`

### ADMIN only

Dispatch a confirmed Sales Order.

Example request:

``` json
{
  "vehicleNo": "KA01AB1234",
  "driverName": "Ravi Kumar"
}
```

### Required behavior

-   Sales Order must be `CONFIRMED`.
-   Dispatch must not already exist for the same order.
-   Dispatch quantity cannot exceed reserved quantity.
-   Physical quantity decreases.
-   Reserved quantity decreases.
-   Sales Order becomes `DISPATCHED`.

Example:

``` text
Before:
Physical = 100
Reserved = 60

Dispatch = 60

After:
Physical = 40
Reserved = 0
```

------------------------------------------------------------------------

# Authorization Matrix

  Operation                                               ADMIN                       SALES_USER
  ---------------------------- -------------------------------- --------------------------------
  Login                                                      ✅                               ✅
  View records                                               ✅   According to application rules
  Create customer/enquiry                              Optional                               ✅
  Create quotation                                     Optional                               ✅
  Accept/Reject quotation        According to application rules                               ✅
  Convert accepted quotation     According to application rules                               ✅
  View inventory                                             ✅                               ✅
  Confirm Sales Order                                        ✅                               ❌
  Reserve inventory                  Through order confirmation                               ❌
  Process dispatch                                           ✅                               ❌

The backend must enforce restricted operations. Hiding buttons in React
is not sufficient.

------------------------------------------------------------------------

# Standard Error Examples

### 400 -- Validation Error

``` json
{
  "message": "Cannot reserve more than available inventory"
}
```

### 401 -- Authentication Required

``` json
{
  "message": "Authentication required"
}
```

### 403 -- Forbidden

``` json
{
  "message": "Admin access required"
}
```

### 404 -- Not Found

``` json
{
  "message": "Sales Order not found"
}
```

### 409 -- Conflict

``` json
{
  "message": "Sales Order already exists for this quotation"
}
```

------------------------------------------------------------------------

# Required Automated API/Business Tests

1.  Quotation total is calculated correctly.
2.  DRAFT/REJECTED quotation cannot create a Sales Order.
3.  Same quotation cannot generate duplicate Sales Orders.
4.  Cannot reserve more than available inventory.
5.  Unauthorized user cannot perform a restricted operation.

Bonus:

6.  Two simultaneous reservations cannot oversell the same inventory.

------------------------------------------------------------------------

# Suggested Demo Sequence

``` text
POST /auth/login
      ↓
POST /enquiries
      ↓
POST /quotations
      ↓
PATCH /quotations/:id/status
      ↓
POST /quotations/:id/convert
      ↓
POST /sales-orders/:id/confirm
      ↓
POST /sales-orders/:id/dispatch
```

# FundsRoom -- PERN ERP Application

## Overview

FundsRoom is a focused ERP application for a manufacturing and supply
workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation →
Dispatch**

The application is implemented using the PERN stack and focuses on
relational database design, authentication, role-based authorization,
validation, transactions, and data consistency.

## Tech Stack

-   **Frontend:** React.js
-   **Backend:** Node.js + Express.js
-   **Database:** PostgreSQL
-   **ORM:** Prisma
-   **Authentication:** JWT
-   **Password Security:** bcrypt
-   **API Style:** REST

## User Roles

### ADMIN

-   View all records
-   Manage inventory
-   Confirm Sales Orders
-   Process dispatch

### SALES_USER

-   Create customers and enquiries
-   Create quotations
-   Convert accepted quotations into Sales Orders
-   View inventory availability

## Core Workflow

1.  Sales User creates a customer/enquiry.
2.  Sales User creates a quotation against the enquiry.
3.  Quotation moves through `DRAFT → SENT → ACCEPTED/REJECTED`.
4.  Only an `ACCEPTED` quotation can be converted to a Sales Order.
5.  Admin confirms the Sales Order.
6.  Confirmation checks inventory and reserves stock.
7.  Reservation increases `reservedQty`; physical stock does not
    decrease.
8.  Admin dispatches the confirmed order.
9.  Dispatch decreases both physical and reserved quantities.

## Inventory Rule

``` text
Available Quantity = Physical Quantity - Reserved Quantity
```

The backend must reject negative quantities and reservations beyond
available stock.

## Database Entities

-   users
-   customers
-   products
-   inventory
-   enquiries
-   enquiry_items
-   quotations
-   quotation_items
-   sales_orders
-   sales_order_items
-   dispatches

See [ER_DIAGRAM.md](./ER_DIAGRAM.md).

## Main Screens

1.  Login
2.  Enquiries
3.  Quotations
4.  Sales Orders

Inventory availability can be displayed inside the Sales Order screen.

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## Environment Variables

Create a `.env` file in the backend with values appropriate for the
deployment environment:

``` env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="replace-with-a-secure-secret"
PORT=5000
```

Do not commit `.env` or database credentials to GitHub.

## Setup

### Backend

``` bash
cd backend
npm install
npx prisma generate
```

Apply the project's Prisma migration/database setup:

``` bash
npx prisma migrate dev
```

If the existing project uses database push instead of migrations, use
the project's existing workflow:

``` bash
npx prisma db push
```

Seed sample data if a seed script is configured:

``` bash
npx prisma db seed
```

Start the backend using the script defined in `backend/package.json`,
for example:

``` bash
npm run dev
```

### Frontend

``` bash
cd frontend
npm install
npm run dev
```

Use the backend API URL configured by the existing frontend
environment/configuration.

## Test Accounts

Use the seeded credentials configured in the project. Do not publish
real passwords in this README.

Typical roles required by the case study:

``` text
ADMIN
SALES_USER
```

## Testing

The case study requires at least five automated tests:

1.  Quotation total is calculated correctly.
2.  DRAFT/REJECTED quotation cannot create a Sales Order.
3.  The same quotation cannot generate duplicate Sales Orders.
4.  Inventory cannot be reserved beyond available quantity.
5.  Unauthorized users cannot perform restricted operations.

If the project contains a test script, run:

``` bash
npm test
```

## Important Business Rules

### Quotation

For each quotation item:

``` text
Base Amount = Quantity × Unit Price
```

Discount and GST are applied by the backend, and the final quotation
amount must be calculated or validated on the backend.

### Sales Order

Allowed conversion:

``` text
ACCEPTED quotation → Sales Order
```

Not allowed:

``` text
DRAFT quotation → Sales Order
REJECTED quotation → Sales Order
```

A quotation can generate only one Sales Order.

### Reservation

Example:

``` text
Physical = 100
Reserved = 30
Available = 70

Order requirement = 60

After reservation:
Physical = 100
Reserved = 90
Available = 10
```

Inventory reservation must be protected at the database/backend level
using an appropriate PostgreSQL transaction/locking approach.

### Dispatch

Example:

``` text
Before:
Physical = 100
Reserved = 60
Available = 40

Dispatch = 60

After:
Physical = 40
Reserved = 0
Available = 40
```

The backend must prevent dispatch beyond reserved quantity, duplicate
dispatch, and dispatch of cancelled orders.

## Project Structure

``` text
FundsRoom/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── README.md
├── API_DOCUMENTATION.md
└── ER_DIAGRAM.md
```

## Demo Flow

The recommended demo is:

``` text
Login
  ↓
Create Customer / Enquiry
  ↓
Create Quotation
  ↓
Accept Quotation
  ↓
Convert to Sales Order
  ↓
Admin Login
  ↓
Confirm Sales Order / Reserve Inventory
  ↓
Dispatch
  ↓
Verify Inventory
```

## Security

-   JWT is used for authentication.
-   Passwords are stored as hashes rather than plaintext.
-   Restricted operations are authorized by the backend.
-   Environment secrets are kept outside source control.
-   Input validation is performed on API requests.

## Submission Checklist

-   [ ] Git repository
-   [ ] Complete source code
-   [ ] Reasonable Git development history
-   [ ] README
-   [ ] PostgreSQL database setup
-   [ ] Migration/seed instructions
-   [ ] ER diagram
-   [ ] API documentation
-   [ ] Automated tests
-   [ ] Working demo
-   [ ] Demo video up to 5 minutes

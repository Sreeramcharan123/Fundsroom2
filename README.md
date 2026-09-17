# FundsRoom ERP / CRM

A focused PERN-stack ERP + CRM operations portal for a manufacturing and supply
business. It manages the complete sales workflow end to end:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

The project emphasizes relational database design, JWT authentication,
role-based authorization, backend validation, database transactions, and
inventory consistency.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [API Documentation](#api-documentation)
- [ER Diagram](#er-diagram)
- [Postman Collection](#postman-collection)
- [Testing](#testing)
- [Business Rules](#business-rules)
- [Deployment](#deployment)

---

## Project Overview

FundsRoom lets a sales team capture a customer enquiry, price it in a
quotation, and — once the quotation is accepted — convert it into a sales
order. An administrator then confirms the order (which **reserves** inventory)
and finally dispatches it (which **decrements** both physical and reserved
stock).

Inventory availability is always derived as:

```text
Available Quantity = Physical Quantity - Reserved Quantity
```

All pricing, status transitions, and inventory movements are validated and
computed on the backend.

## Features

- JWT authentication with bcrypt password hashing
- Role-based access control (ADMIN, SALES, WAREHOUSE, ACCOUNTS)
- Customer and product management
- Enquiry capture with multiple line items
- Quotation generation with per-line discount and GST
- Server-side quotation total calculation and validation
- Quotation status workflow: `DRAFT → SENT → ACCEPTED / REJECTED`
- One-way conversion of **only** an accepted quotation into a sales order
- One sales order per quotation (enforced with a unique constraint)
- Inventory reservation on sales order confirmation
- Row-level locking inside a database transaction to prevent over-reservation
- Dispatch processing that reduces physical and reserved stock
- Duplicate-dispatch protection
- Sales order and inventory status dashboards
- Automated integration tests

## User Roles

| Role | Capabilities |
| --- | --- |
| **ADMIN** | Full access, manage inventory, confirm sales orders, process dispatch |
| **SALES** | Manage customers, create enquiries and quotations, convert accepted quotations to sales orders, view stock |
| **WAREHOUSE** | Manage products and inventory |
| **ACCOUNTS** | Read-only visibility of records |

## Technology Stack

- **Frontend:** React.js, TypeScript, Vite, Axios
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **Password Security:** bcrypt
- **API Style:** REST

## Project Structure

```text
fundsroom2/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data model, enums, relations
│   │   └── seed.ts              # Sample users, customers, products
│   ├── src/
│   │   ├── controllers/         # Request handlers (auth, customer, product, enquiry, quotation, sales order, challan)
│   │   ├── routes/              # Express route definitions
│   │   ├── middleware/          # JWT auth and role guards
│   │   ├── lib/prisma.ts        # Prisma client singleton
│   │   ├── utils/quoteCalc.ts   # Quotation total calculation
│   │   ├── app.ts               # Express app and route mounting
│   │   └── server.ts            # Server bootstrap
│   ├── test/api.test.ts         # Automated integration tests
│   ├── .env.example             # Environment template
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Login, dashboard, and feature screens
│   │   ├── App.css
│   │   ├── main.tsx
│   │   └── assets/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── API_DOCUMENTATION.md
├── ER_DIAGRAM.md
├── FINAL_CHECKLIST.md
├── FundsRoom_Postman_Collection.json
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/Sreeramcharan123/Fundsroom2.git
cd Fundsroom2
```

Install backend and frontend dependencies separately (each has its own
`package.json`):

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Environment Variables

Create a `.env` file in `backend/` based on `backend/.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
```

The frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:5000`).

> **Never commit real credentials.** `.env` files are excluded by
> `.gitignore`; only `.env.example` with placeholder values is tracked.

## Database Setup

Ensure a PostgreSQL database is available and the connection string is set in
`backend/.env`. Then generate the Prisma client and create the schema:

```bash
cd backend
npx prisma generate
npx prisma db push
```

Seed sample data (users, customers, products, inventory):

```bash
npm run seed
```

## Backend Setup

```bash
cd backend
npm run dev        # start in watch mode (http://localhost:5000)
```

Other scripts:

```bash
npm run build      # compile TypeScript to dist/
npm start          # run the compiled server
npm run seed       # seed sample data
npm test           # run automated tests
```

## Frontend Setup

```bash
cd frontend
npm run dev        # start the Vite dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # production build
npm run preview    # preview the production build
npm run lint       # lint the source
```

## API Documentation

Full endpoint reference — routes, request bodies, responses, and required
roles — is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

Core route groups:

- `/auth` — login and authentication
- `/customers`
- `/products`
- `/enquiries`
- `/quotations`
- `/sales-orders`
- `/challans`

## ER Diagram

The entity relationships (users, customers, products, inventory, enquiries,
quotations, sales orders, dispatch records) are documented in
[ER_DIAGRAM.md](./ER_DIAGRAM.md).

## Postman Collection

Import [FundsRoom_Postman_Collection.json](./FundsRoom_Postman_Collection.json)
into Postman to exercise the API. Set the `baseUrl` variable to your backend
URL (for example, `http://localhost:5000`) and run the login request first to
obtain a JWT for authenticated endpoints.

## Testing

Automated integration tests live in `backend/test/api.test.ts` and run against
the configured database:

```bash
cd backend
npm test
```

The suite covers, among other cases:

1. Quotation totals are calculated correctly and ignore client-supplied values.
2. `DRAFT` / `REJECTED` quotations cannot create a sales order.
3. A single quotation cannot generate duplicate sales orders.
4. Inventory cannot be reserved beyond available quantity.
5. Unauthorized requests are rejected (401/403).
6. Concurrent reservations are serialized correctly via row locking.
7. Confirm → dispatch succeeds and duplicate dispatch is blocked.

## Business Rules

### Quotation

```text
Base Amount = Quantity × Unit Price
```

Discount and GST are applied per line; the final quotation total is calculated
or validated on the backend.

### Sales Order

Allowed conversion:

```text
ACCEPTED quotation → Sales Order
```

Not allowed:

```text
DRAFT quotation    → Sales Order
REJECTED quotation → Sales Order
```

A quotation can generate only one sales order.

### Reservation

```text
Physical = 100, Reserved = 30, Available = 70
Order requirement = 60

After reservation:
Physical = 100, Reserved = 90, Available = 10
```

Reservation increments `reservedQuantity` only; physical stock is unchanged and
the operation is protected by a database transaction with row locking.

### Dispatch

```text
Before: Physical = 100, Reserved = 60, Available = 40
Dispatch = 60
After:  Physical = 40,  Reserved = 0,  Available = 40
```

Dispatch decreases both physical and reserved quantities. Dispatching beyond
reserved quantity, duplicate dispatch, and dispatch of cancelled orders are all
rejected.

## Deployment

- **Database:** host PostgreSQL (e.g. Neon, Supabase, RDS) and set
  `DATABASE_URL` / `DIRECT_DATABASE_URL` in the backend environment.
- **Backend:** build with `npm run build` and start with `npm start`
  (Node.js host, container, or PaaS). Set `JWT_SECRET`, `PORT`, and database
  variables in the hosting environment.
- **Frontend:** build with `npm run build` and deploy the generated `dist/`
  directory to any static host. Point `VITE_API_BASE_URL` at the deployed
  backend URL.
- Apply the schema with `npx prisma db push` (or migrations) against the
  production database before first use.

## Security

- Passwords are stored as bcrypt hashes, never plaintext.
- JWT is used for authentication; restricted operations are authorized on the
  backend by role.
- Environment secrets are kept out of source control.
- Request payloads are validated on the API.

---

See [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) for the project completion
checklist.

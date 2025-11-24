pmd_system_instructions_for_cursor.md
Full Technical + Functional Specification for PMD Management System
Ready for Cursor AI – Generate Backend, Database & Architecture Automatically
------------------------------------------------------------
1. SYSTEM OVERVIEW
------------------------------------------------------------

PMD is a high-end architecture & construction company that requires a complete internal management system capable of handling:

Project (Work / “Obra”) administration

Cash handling per user

Expenses

Suppliers

Contracts

Accounting (fiscal + internal)

Scheduling (Gantt)

Alerts

Dashboards

Roles & permissions

Audit logs

File storage

Multi-currency handling (ARS / USD)

The system must be modular, scalable, and integrated so that every data point is entered once and automatically flows to the correct modules.

Cursor must generate:

Backend structure

Database schema (PostgreSQL recommended)

API endpoints

Models

Controllers

Validation layers

Authentication system

Role-based restrictions

File storage adapters

Audit logging mechanisms

The goal is to build the foundation, not the full UI.

------------------------------------------------------------
2. USER ROLES & PERMISSIONS
------------------------------------------------------------

Define four main roles:

1. Direction

Full access

Can override blocks

Can modify any record

Can reopen closed months

Can manage users

Can view financial dashboards

2. Supervisor (Project Manager / Chief Architect)

Can view all works

Can view all cashboxes

Can mark schedule stages as completed

Cannot modify accounting

Cannot change tax settings

Cannot modify roles

3. Administration / Accounting

Validates expenses

Approves suppliers

Manages contracts

Manages accounting details

Generates reports

Can edit validated expenses

4. Operator / Buyer / Logistics

Has their own cashbox

Can record expenses

Can create provisional suppliers

Can attach files/photos

Cannot view others’ cashboxes

Cannot manage contracts or accounting

All role-based permissions must be enforced in backend endpoints.

------------------------------------------------------------
3. CASH MODULE (CAJA)
------------------------------------------------------------
General Rules

One open cashbox per user at a time.

Cashbox supports ARS and USD simultaneously.

Refills can be loaded by both Operator and Administration.

Cashbox must store:

opening balance

movements

closing balance

differences (pending approval)

Difference is not auto-adjusted; Administration must approve.

Historical cashboxes must remain accessible.

------------------------------------------------------------
4. EXPENSE MODULE
------------------------------------------------------------
Required fields

Work (mandatory)

Supplier or provisional supplier

Rubric (category)

Amount

Currency

Purchase date (REAL date, not upload date)

Document type (invoice A/B/C, receipt, VAL)

File or VAL auto-generated

States:

pending

validated

observed

annulled

Flow:

Operator loads expense

Admin validates or observes

Accounting receives validated expense

System updates:

contracts

works

dashboards

accounting registry

cashbox movements

alerts if needed

Provisional supplier:

Operator may create

Admin must approve or reject

If rejected → expenses must be reassigned

VAL generation:

If no formal doc → generate auto code:
VAL-000001, VAL-000002, ...

------------------------------------------------------------
5. WORKS / PROJECTS MODULE
------------------------------------------------------------
Required fields:

name

client

address

start date

status

supervisor

Currency:

ARS or USD

Cannot be changed later

Budgets:

One initial

Multiple addenda

Work status:

Active

Paused

Finished

Administratively Closed

Archived

Work financial view:

System must calculate:

validated expenses

incomes

contract commitments

profit/loss

physical progress

economic progress

financial progress

------------------------------------------------------------
6. SUPPLIERS & CONTRACTS MODULE
------------------------------------------------------------
Supplier fields:

name

CUIT

email

phone

category

status

created_at

Supplier status:

provisional

approved

blocked

rejected

Documentation (per supplier):

ART

personal accident insurance

AFIP

IIBB

expiration date

Rules:

If ART expires → supplier becomes BLOCKED

BLOCKED → cannot be used for:

expenses

contracts

Contracts:

Multiple contracts per supplier per work allowed

Fields:

work_id

supplier_id

rubric_id

amount_total

amount_executed

currency

file_url

payment terms

Block rules:

When amount_executed = amount_total → auto-block

Only Direction may override

------------------------------------------------------------
7. INCOMES MODULE
------------------------------------------------------------

Only Administration and Direction can register incomes.

Fields:

work

type (advance, certification, final payment)

amount

currency

file attachment

date

validation state

Impact:

Updates dashboard

Updates financial progress

Updates income vs contracted value

------------------------------------------------------------
8. SCHEDULE / GANTT MODULE
------------------------------------------------------------
Fields:

work_id

stage_name

start_date

end_date

actual_end_date

state (pending, in progress, completed, delayed)

Rules:

Supervisor can mark as completed

Direction can edit structure

Admin = read only

------------------------------------------------------------
9. ALERTS MODULE
------------------------------------------------------------

Alerts must arise automatically from:

expired supplier documentation

cashbox differences

contract with zero balance

duplicate invoices

overdue stages

observed expenses

missing validation

pending income confirmation

Severity:

info

warning

critical

Alerts must be stored and auditable.

------------------------------------------------------------
10. DASHBOARDS
------------------------------------------------------------
Direction Dashboard (private)

Shows:

global incomes

global expenses

profit

rankings

risks

alerts

Supervisor Dashboard

progress

contracts

supplier status

pending validations

Administration / Accounting Dashboard

pending expenses

observed expenses

tax summaries

supplier approvals

------------------------------------------------------------
11. ACCOUNTING MODULE
------------------------------------------------------------

System supports two intertwined accountings:

1. Cash/Internal Accounting

(VA L, non-fiscal documents)

2. Fiscal/Tax Accounting

(Invoice A/B/C, VAT, IIBB, withholdings, perceptions)

Must support:

VAT 21/10.5/27

VAT perceptions

IIBB perceptions

VAT withholdings

Income tax withholdings

Reports:

IVA Purchases Book

Monthly accounting sheet

Perceptions report

Withholdings report

Work financials

Supplier ledger

Monthly closing:

Locks the month

Only Direction can reopen

------------------------------------------------------------
12. FILES & STORAGE
------------------------------------------------------------

Use:

Google Drive API

OR Dropbox API

Allowed file types:

PDF

JPG

PNG

Excel

Word

Naming:

Suggest automatic clear names

Allow override

Offline mode:

Local storage

Auto sync when online

Optional:

OCR extraction for invoices

------------------------------------------------------------
13. AUDIT LOG
------------------------------------------------------------

Log events must include:

user

action

module

previous_value

new_value

timestamp

IP

criticality

Audit logs must be immutable.

------------------------------------------------------------
14. TECHNICAL IMPLEMENTATION REQUIREMENTS
------------------------------------------------------------
Recommended Stack:

Backend: Node.js (NestJS preferred) OR Python (FastAPI)

Database: PostgreSQL

Auth: JWT + optional Google OAuth

Architecture: REST API, modular, clean layers

Files: Drive/Dropbox adapter service

Audit: middleware to capture all actions

Testing: basic unit tests auto-generated

------------------------------------------------------------
15. DATA MODEL (POSTGRESQL)
------------------------------------------------------------

Include all tables with FK relations:

users

roles

suppliers

supplier_documents

works

work_budgets

contracts

expenses

val

incomes

cashboxes

cash_movements

work_schedule

alerts

accounting_records

audit_log

rubrics

------------------------------------------------------------
16. INITIAL PROMPTS FOR CURSOR
------------------------------------------------------------

Copy and paste this prompt inside Cursor after creating a new project:

PROMPT 1 — Generate the backend architecture
You are building the PMD Management System backend.

Use Node.js with NestJS and PostgreSQL.

Create the initial folder structure with modules for:
users, roles, auth, suppliers, supplier_documents, works, work_budgets, contracts,
rubrics, expenses, val, incomes, cashboxes, cash_movements, schedule,
alerts, accounting, audit.

Generate all entities, DTOs, services, controllers, and module files.

Implement RBAC using the roles described in the document.

Connect PostgreSQL with TypeORM and generate all models.

PROMPT 2 — Generate database migrations
Generate the PostgreSQL migrations for all entities in the PMD system.

Ensure relationships follow the specifications in the data model.

PROMPT 3 — Implement validations and business rules
Implement all business rules as described:
- One open cashbox per user
- VAL auto-generation
- Supplier block when ART expired
- Contract auto-block when balance = 0
- Required work in every expense
- Role permissions
- Lock month close unless Direction overrides

PROMPT 4 — Implement audit logging
Create an audit logging middleware that captures:
user_id, module, action, previous_value, new_value, timestamp, IP.

Make it immutable.

PROMPT 5 — Generate API documentation
Generate OpenAPI (Swagger) documentation for all endpoints.

------------------------------------------------------------
17. FINAL INSTRUCTION TO CURSOR
------------------------------------------------------------

"Follow this document exactly.
Generate all backend modules, endpoints, models and database schemas for the PMD System."

✔ FIN DEL ARCHIVO
pmd_system_instructions_for_cursor.md
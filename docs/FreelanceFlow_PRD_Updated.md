# FreelanceFlow – Product Requirements Document (Updated)

## 1. Overview
**Product Name:** FreelanceFlow  
**Product Type:** Freelance project, time tracking, and client transparency platform  
**Primary User:** Freelancer  
**Secondary User:** Client (invited, permission-scoped)

FreelanceFlow helps freelancers manage projects, tasks, and time tracking while providing controlled visibility to clients for trust, approvals, and reporting.

---

## 2. Goals & Objectives
- Enable freelancers to manage multiple clients and projects efficiently
- Provide transparent, auditable time tracking
- Allow clients to review and approve work without operational control
- Serve as a portfolio-grade, real-world system demonstrating senior backend and fullstack skills

---

## 3. User Roles

### 3.1 Freelancer (Primary User)
- Registers and authenticates directly
- Owns all data within their workspace
- Creates and manages clients, projects, tasks, and time logs

### 3.2 Client (Invited User)
- Cannot self-register
- Created and invited by a freelancer
- Has limited, read-heavy permissions scoped to assigned projects only

---

## 4. Client Model (Updated)

### 4.1 Client Lifecycle
1. Freelancer creates a client profile (name, email, company)
2. Freelancer optionally sends an invite
3. Client accepts invite via secure token
4. Client sets password or uses magic-link authentication
5. Client gains access only to assigned projects

---

## 5. Permissions & Capabilities

### 5.1 Freelancer Capabilities
- Create / update / archive clients
- Create and manage projects
- Create tasks within projects
- Log and edit time entries
- Assign clients to projects
- View reports and summaries
- Control billing rates

### 5.2 Client Capabilities
Clients are **not full system users**. They can:

- View assigned projects
- View tasks within assigned projects
- View time logs (read-only)
- Approve or flag time logs
- View weekly/monthly summaries
- Comment on projects or tasks

### 5.3 Explicit Restrictions for Clients
Clients cannot:
- Create or edit projects
- Create or edit tasks
- Log time
- See other clients or projects
- Modify billing rates
- Access freelancer profile or internal notes

---

## 6. Core Features

### 6.1 Project Management
- Projects belong to a freelancer
- Projects may have multiple tasks
- Projects can be assigned to one or more clients for visibility

### 6.2 Task Management
- Tasks belong to a project
- Tasks are owned by the freelancer
- Tasks may have multiple time logs

### 6.3 Time Tracking
- Time logs belong to a single task
- Time logs are immutable once approved
- Time logs include:
  - start_time
  - end_time
  - duration
  - approval_status (pending, approved, flagged)

---

## 7. Data Model Relationships (High Level)

- Freelancer (User)
  - has many Clients
  - has many Projects

- Client
  - belongs to Freelancer
  - has many ProjectAccess records

- Project
  - belongs to Freelancer
  - has many Tasks
  - has many ClientProjectAccess records

- Task
  - belongs to Project
  - has many TimeLogs

- TimeLog
  - belongs to Task
  - approval_status managed by Client

---

## 8. Authentication & Authorization

### 8.1 Freelancer Authentication
- Email + password
- JWT access tokens
- Refresh tokens
- Role: `freelancer`

### 8.2 Client Authentication
- Invite-based onboarding
- Secure, expiring invite tokens
- Password or magic link authentication
- Role: `client`
- Project-scoped authorization

---

## 9. Non-Functional Requirements
- Strong data isolation between freelancers
- Least-privilege access for clients
- Audit-friendly time logs
- Scalable backend architecture (NestJS / Elixir / Go services)
- REST APIs with future GraphQL readiness

---

## 10. Success Metrics
- Freelancer can onboard a client in < 2 minutes
- Client can review weekly time logs in < 3 clicks
- Zero unauthorized cross-client data access
- Clean domain modeling suitable for senior engineering interviews

---

## 11. Future Extensions (Out of Scope)
- Invoicing & payments
- Multi-freelancer teams
- Client-initiated task requests
- Public client portals

---

## 12. Portfolio Positioning
This project demonstrates:
- Domain-driven design
- Permission modeling
- Secure authentication flows
- Real-world SaaS architecture decisions
- Senior-level backend and system design thinking

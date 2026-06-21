# Shared Data Model

> CRITICAL GATE: Any modification to this file requires a full downstream impact assessment and explicit human sign-off.

## Core Entities

### Tenant (School)
* `id`: UUID (Primary Key)
* `name`: String
* `subdomain`: String (Unique)
* `status`: Enum (ACTIVE, SUSPENDED, DEACTIVATED)
* `createdAt`: Timestamp

### User
* `id`: UUID (Primary Key)
* `tenantId`: UUID (Foreign Key -> Tenant.id)
* `email`: String (Unique within tenant scope)
* `passwordHash`: String (Argon2id/Bcrypt secure string)
* `status`: Enum (ACTIVE, INACTIVE)
* `createdAt`: Timestamp

### Role Mapping
* `id`: UUID
* `userId`: UUID (Foreign Key -> User.id)
* `role`: Enum (SUPERADMIN, SCHOOLADMIN, ACCOUNTANT, TEACHER, STUDENT, GUARDIAN)

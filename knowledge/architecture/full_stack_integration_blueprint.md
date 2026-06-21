# Full-Stack Integration Blueprint & System Ledger


This system reference document maps client interfaces to database structures. It establishes the multi-tenant isolation rules, transaction definitions, and index strategies required to connect frontend components directly to the core API.


---


## 1. System-Wide Isolation & Security Foundation


Every database row across all modules must validate against an explicit tenant boundary layer. Data queries must not leak across distinct institutional domains.


### Multi-Tenant Perimeter Layout
* **Global Boundary Key:** `tenantId: String (UUID)`
* **Rule of Execution:** Every API route controller must extract the active tenant context from the verified session token. It must never rely on incoming payload parameters to determine tenant assignment.
* **Prisma Context Pattern:**
  ```prisma
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
2. Student Sub-Ledger Domain Matrix
Tracks student profiles, ingestion lifecycles, and operational workflows like leave requests.
Client-to-Server Data Schema Contracts
Frontend View Path
Operational Mode
Primary Schema Target
Dependent Mutations & Rules
/app/students/enroll
Data Ingestion
Student
Creates initial billing account line item; updates class section seat counters.
/app/students/leave
Workflow Lifecycle
StudentLeaveRequest
Initializes at PENDING. Status transition to APPROVED recalculates attendance caches.

Consolidated Student Domain Schema
Code snippet
enum LeaveType {
  SICK
  FAMILY_EMERGENCY
  PERSONAL
  ACADEMIC
  RELIGIOUS
  OTHER
}


enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}


model Student {
  id              String                @id @default(uuid())
  firstName       String
  lastName        String
  status          String                // e.g., "ACTIVE", "DEPARTED", "APPLICANT"
  classSectionId  String
  classSection    ClassSection          @relation(fields: [classSectionId], references: [id])
  leaveRequests   StudentLeaveRequest[]
  
  tenantId        String
  createdAt       DateTime              @default(now())


  @@index([classSectionId, status])
  @@index([tenantId])
}


model StudentLeaveRequest {
  id              String      @id @default(uuid())
  type            LeaveType
  startDate       DateTime
  endDate         DateTime
  reason          String      @db.Text
  documentUrl     String?     // Secure storage path for physical files
  status          LeaveStatus @default(PENDING)
  
  rejectionReason String?     @db.Text
  reviewedAt      DateTime?
  reviewedById    String?     


  studentId       String
  student         Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  tenantId        String


  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt


  @@index([studentId])
  @@index([status])
  @@index([tenantId])
}


3. Staff & Teacher Management Sub-Ledger
Normalizes human resources, academic assignments, and financial tracking structures away from a flat data layout to maintain system integrity.
Data Split Strategy
To avoid data repetition and validation bugs, the multi-tab /app/teachers workspace populates data fields across three separate relational targets:
StaffProfile (Overview & Qualifications Tabs): Core identification, legal names, degree levels, and professional licensing records.
CourseAssignment (Assignments Tab): Relational tracking links connecting the staff profile to specific subject models and section records.
PayrollRecord (Compensation Tab): Financial history logs mapping base pay scales, regulatory tax frameworks, and net payouts.
Consolidated Staff Domain Schema
Code snippet
enum StaffStatus {
  ACTIVE
  PENDING_REVIEW
  SUSPENDED
  TERMINATED
  DEPARTED
}


enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  PROBATION
}


model StaffProfile {
  id                 String             @id @default(uuid())
  teacherId          String             @unique // Structural Display ID (e.g., TCH-101)
  firstName          String
  lastName           String
  email              String             @unique
  phone              String?
  department         String             
  status             StaffStatus        @default(PENDING_REVIEW)
  employmentType     EmploymentType     @default(FULL_TIME)
  hireDate           DateTime           @default(now())
  qualification      String             
  yearsOfExperience  Int                @default(0)
  licenseStatus      String             
  nationalIdToken    String?            // Identity verification cross-reference key


  assignments        CourseAssignment[]
  payrollRecords     PayrollRecord[]
  tenantId           String


  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt


  @@index([tenantId])
  @@index([status])
}


model CourseAssignment {
  id             String       @id @default(uuid())
  staffProfileId String
  staffProfile   StaffProfile @relation(fields: [staffProfileId], references: [id], onDelete: Cascade)
  subjectName    String       
  classSectionId String
  weeklyHours    Int          @default(0)


  @@index([staffProfileId])
  @@index([classSectionId])
}


model PayrollRecord {
  id              String       @id @default(uuid())
  staffProfileId  String
  staffProfile    StaffProfile @relation(fields: [staffProfileId], references: [id], onDelete: Cascade)
  payPeriod       String       // e.g., "June 2026"
  baseSalary      Decimal      @db.Decimal(10, 2)
  graTaxDeduction Decimal      @db.Decimal(10, 2) // Income tax compliance line item
  ssnitDeduction  Decimal      @db.Decimal(10, 2) // National pension allocation
  otherDeductions Decimal      @db.Decimal(10, 2)
  netPay          Decimal      @db.Decimal(10, 2)


  @@index([staffProfileId])
  @@index([payPeriod])
}


4. Lifecycle Transaction Control Logic
These transactional operations protect data consistency across application boundaries during major state mutations.
The Ingestion Pipeline (POST /api/teachers)
When onboarding a new educator, the backend database engine wraps operations inside an all-or-nothing database transaction:
Plaintext
START TRANSACTION
  1. Create a baseline Auth User account linked to the local institutional identity.
  2. Verify National Identity parameters (Format validation loops).
  3. Insert the primary StaffProfile row with status "PENDING_REVIEW".
  4. Instantiate an active base tracking ledger row in PayrollRecord.
COMMIT TRANSACTION


The Departure Pipeline (POST /api/teachers/exit)
To record a personnel departure without corrupting historical schedules, the system executes this cleanup script:
Plaintext
START TRANSACTION
  1. Blacklist active system authorization tokens for the departing staff member.
  2. Update StaffProfile.status to "DEPARTED" or "TERMINATED".
  3. Query CourseAssignment rows matching staffProfileId.
  4. Clear the staffProfileId link from those slots, flagging them as "Vacant Class Schedule".
  5. Close outstanding monthly accounting payroll lines and mark as locked.
COMMIT TRANSACTION


5. UI Filter Query Ingestion Contracts
Optimizes performance for interactive client dashboard filters like AcademicSectionSelector or UniversalSearch.
Query Resolution Mappings
Plaintext
[Section Button Clicked] 
       │
       ▼
   Get Section ID ───► Run Query: Student.findMany({ where: { classSectionId, status: "ACTIVE" } })
       │
       ▼
   Execute DB Composite Index Match: @@index([classSectionId, status])
       │
       ▼
   [Instant UI Table Rerender]


Search Engine Optimization Rules
Text Input Handling: Searches against multi-field keys must combine fields like name, identification token, or assigned departments inside an explicit OR container.
Database Optimization Rule: To prevent query delays during concurrent lookups, the system avoids partial text searches on large tracking lists. Instead, it processes quick index lookups using text flags combined directly with the tenant ID:
TypeScript
where: {
  tenantId,
  status: "ACTIVE",
  OR: [
    { firstName: { contains: query, mode: 'insensitive' } },
    { lastName: { contains: query, mode: 'insensitive' } }
  ]
}





---

## 6. Financial Revenue Collection Domain Matrix

Tracks real-time fee allocations, multi-channel processing protocols (MoMo, Wire, Cash), and payment clearance lifecycles.

### Data Aggregation & State Rules
1. **Balance Rollups:** When a `FeeCollection` status transitions to `CLEARED`, a database hook must automatically subtract the `amountPaid` from the connected `FeeInvoice.outstandingAmount`.
2. **Student Cache Synchronization:** The balance rollup must simultaneously decrement the cached `feeBalance` on the core `Student` profile record.
3. **Audit Immutability:** Once a collection entry is marked as `CLEARED`, the API row locks to block modifications, preserving a permanent ledger trail for financial audits.

### Database Schema Model Expansion

```prisma
enum PaymentMethod {
  CASH_SETTLEMENT
  BANK_WIRE_TRANSFER
  MOBILE_MONEY_MOMO
  BANK_CHEQUE_DRAFT
}

enum CollectionStatus {
  PENDING
  CLEARED
}

model FeeCollection {
  id             String           @id @default(uuid())
  amountPaid     Decimal          @db.Decimal(10, 2)
  paymentMethod  PaymentMethod
  referenceNo    String           // Stores unique reference hashes (e.g., MOMO-REF-X)
  status         CollectionStatus @default(PENDING)
  dateProcessed  DateTime         @default(now())

  // Relational System Hooks
  invoiceId      String
  invoice        FeeInvoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  studentId      String
  student        Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  tenantId       String
  tenant         Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([invoiceId])
  @@index([studentId])
  @@index([tenantId])
  @@index([status])
}

---

## 7. Operational Expenditure (Expense) Sub-Ledger Domain Matrix

Tracks organizational outlays, commercial utility tariffs, and administrative approval workflows.

### Capital Outflow & Cashflow Lifecycle Rules
1. **Approval State Gate:** An expense record initialized as `PENDING_APPROVAL` has zero impact on cash flow summaries. It operates strictly as a projection log.
2. **Ledger Disbursal Sync:** The instant an administrative actor promotions an expense status token to `CLEARED`, the transaction processing engine must register the amount as a verified capital deduction.
3. **Net Yield Calculation:** The analytical pipeline feeding the master viewport dashboard (`/app/dashboard`) calculates absolute instance profitability by running cross-model aggregation queries: `sum(FeeCollection.amountPaid) - sum(Expense.amount)` where status tags for both entities match `CLEARED`.

### Database Schema Model Expansion

```prisma
enum ExpenseStatus {
  CLEARED
  PENDING_APPROVAL
  REJECTED
}

model Expense {
  id            String        @id @default(uuid())
  vendorName    String        
  category      String        // e.g., "Utilities", "Learning Resources"
  description   String        @db.Text
  amount        Decimal       @db.Decimal(10, 2)
  paymentMethod String        // e.g., "Mobile Money (MoMo)", "Bank Cheque"
  status        ExpenseStatus @default(PENDING_APPROVAL)
  expenseDate   DateTime      

  // Multi-Tenant Isolation Boundary
  tenantId      String
  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([tenantId])
  @@index([status])
  @@index([expenseDate])
  @@index([category])
}

---

## 8. Graded Fee Template & Batch Invoicing Dispatch Engine

Manages historical grade-level pricing matrices, automated late-penalty parameters, and all-or-nothing structural batch invoicing runs.

### The Batch Emission Transaction Pipeline (`POST /api/finance/fee-structures/dispatch`)
When an administrator triggers bulk generation for an entire cohort (e.g., the `jhs-1` tier), the backend transaction engine runs this batch pipeline:
```text
START TRANSACTION
  1. Read the active template configurations for the selected gradeTierId.
  2. Query all Student profile IDs where classSectionId resolves to the chosen grade tier AND status = "ACTIVE".
  3. For every student discovered:
     a. Insert a primary FeeInvoice header containing the global issueDate, dueDate, and total accumulated balance sums.
     b. Iterate over mandatory template components to create matching nested child rows inside the InvoiceLineItem table.
  4. Recalculate cached total outstanding fee indices on all modified student records.
COMMIT TRANSACTION
Database Schema Model Expansion
Code snippet
enum BillingFrequency {
  PER_TERM
  PER_YEAR
  ONE_TIME
  MONTHLY
}

model FeeTemplate {
  id               String             @id @default(uuid())
  gradeTierId      String             // Reference matching your UI tiers (e.g., "jhs-1")
  issueDate        DateTime
  dueDate          DateTime
  allowInstallments Boolean           @default(true)
  lateFeeRate      Decimal            @db.Decimal(5, 2) @default(0.00)

  components       FeeTemplateItem[]
  
  // Multi-Tenant Isolation Boundary
  tenantId         String
  tenant           Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  @@unique([tenantId, gradeTierId]) // Ensures only one master template configuration exists per tier per school
}

model FeeTemplateItem {
  id            String           @id @default(uuid())
  name          String           
  amount        Decimal          @db.Decimal(10, 2)
  frequency     BillingFrequency
  isMandatory   Boolean          @default(true)

  templateId    String
  template      FeeTemplate      @relation(fields: [templateId], references: [id], onDelete: Cascade)

  createdAt     DateTime         @default(now())
}

model FeeInvoice {
  id                String            @id @default(uuid())
  studentId         String
  student           Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  totalAmount       Decimal           @db.Decimal(10, 2)
  outstandingAmount Decimal           @db.Decimal(10, 2)
  issueDate         DateTime
  dueDate           DateTime
  allowInstallments Boolean           @default(true)
  lateFeeApplied    Boolean           @default(false)

  lineItems         InvoiceLineItem[]
  collections       FeeCollection[]
  tenantId          String

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([studentId])
  @@index([tenantId])
}

model InvoiceLineItem {
  id           String     @id @default(uuid())
  name         String
  amount       Decimal    @db.Decimal(10, 2)
  
  invoiceId    String
  invoice      FeeInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

---

## 9. Time-Series Analytics & Performance Materialization Domain Matrix

Handles historical transaction tracking rollups, high-speed date-range lookups, and cache materialization rules to power real-time dashboard visualizations.

### Performance Caching & Aggregation Rules
1. **Live Query Isolation:** The analytical endpoints serving components like `FinanceOverviewAnalytics` must never run direct `count()` or `sum()` operations on primary transaction tables during execution.
2. **Materialization Loop:** A automated background tracking script or write-time trigger executes every time a payment clears. This process updates the row in the `DailyFinancialSummary` table matching the current `tenantId` and active date stamp.
3. **Date Boundary Constraints:** Query params filtering data windows (e.g., `?start=2026-05-01&end=2026-06-16`) are validated against standard ISO formats before being passed into database range filters to guarantee index matching.

### Database Schema Model Expansion

```prisma
model DailyFinancialSummary {
  id              String   @id @default(uuid())
  date            DateTime // Normalized date anchor (e.g., 2026-05-01 00:00:00)
  platformRevenue Decimal  @db.Decimal(10, 2) @default(0.00) // Maps to 'platformFee' in UI
  volumeCount     Int      @default(0)                      // Maps to 'transactions' in UI

  // Multi-Tenant Isolation Boundary
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([tenantId, date]) // Prevents duplicate row configurations for a single calendar day
  @@index([tenantId, date])   // Optimizes rapid chronological range sorting scans
}

---

## 10. Unified Treasury Registry & Dynamic Query AST Engine

Controls multi-ledger compound lookups, polymorphic financial views, and execution rules for high-speed dynamic filtering.

### Dynamic Prisma Query Composition Pipeline
When the client passes an operational filtering block to the ledger endpoint (`GET /api/finance/registry?criteria=...`), the data execution layer uses an adapter routine to safely build the query arguments:

```typescript
// Runtime abstract query builder template kept in backend context memory
export async function buildUnifiedLedgerQuery(tenantId: string, criteria: Record<string, any>) {
  const whereClause: Record<string, any> = { tenantId };

  // 1. Array Evaluation for Status Tags
  if (criteria.transactionStatus && criteria.transactionStatus.length > 0) {
    const statusMap = criteria.transactionStatus.map((s: string) => {
      if (s === "Settled") return "CLEARED";
      if (s === "Pending") return "PENDING_APPROVAL";
      return "REJECTED";
    });
    whereClause.status = { in: statusMap };
  }

  // 2. Exact Enum Match for Remittance Routes
  if (criteria.paymentMethod) {
    const methodMap: Record<string, string> = {
      "Bank Wire Transfer": "BANK_WIRE_TRANSFER",
      "Mobile Money (MoMo)": "MOBILE_MONEY_MOMO",
      "Cash Payment": "CASH_SETTLEMENT",
      "Cheque Settlement": "BANK_CHEQUE_DRAFT"
    };
    whereClause.paymentMethod = methodMap[criteria.paymentMethod];
  }

  // 3. Mathematical Range Filters (Floor Limit)
  if (criteria.minAmount) {
    whereClause.amount = { gte: parseFloat(criteria.minAmount) };
  }

  return whereClause;
}
Database Optimization & Compound Indexes
To ensure fast rendering times when filters are adjusted across thousands of active entries, the underlying tables require composite database keys that match the search order parameters:

Code snippet
// Structural composite index enhancements appended to ledger tables:
model UnifiedJournalEntry {
  id            String   @id @default(uuid())
  entryType     String   // "DEBIT" (Expense) vs "CREDIT" (Collection)
  amount        Decimal  @db.Decimal(10, 2)
  paymentMethod String
  status        String
  category      String
  postedDate    DateTime @default(now())

  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status, paymentMethod])
  @@index([tenantId, amount])
  @@index([tenantId, postedDate(sort: Desc)])
}

---

## 11. Core Financial Database Console Orchestrator & Batch Payroll Matrix

Coordinates cross-domain financial operations, logs automated batch payroll distributions, and processes multi-ledger data export structures.

### The Batch Payroll Run Transaction Pipeline (`POST /api/finance/payroll/run`)
When an administrative user clicks **"Run Payroll"** from the staff panel, the transaction coordinator processes employee compensation using an all-or-nothing pipeline:
```text
START TRANSACTION
  1. Read all StaffProfile records where status resolves to "ACTIVE".
  2. For every active staff member discovered:
     a. Fetch their corresponding baseSalary configuration metric.
     b. Run calculation loops to determine GRA PAYE tax bands and employee SSNIT (5.5%) obligations.
     c. Generate a nested data record inside the PayrollRecord table tracking the active target payPeriod string (e.g., "June 2026").
  3. Emit matching administrative capital debit summaries out into the core instance balance ledger.
COMMIT TRANSACTION
Enhanced Relational Payroll Mapping Extensions
Code snippet
// Extension models integrated into the master financial sub-ledger
model PayrollBatchRun {
  id             String          @id @default(uuid())
  payPeriod      String          // Unified target index (e.g., "June 2026")
  totalGrossPay  Decimal         @db.Decimal(10, 2)
  totalTaxDeducted Decimal       @db.Decimal(10, 2)
  totalSsnitDeducted Decimal     @db.Decimal(10, 2)
  isFinalized    Boolean         @default(false)
  processedById  String          // Logs the user ID of the administrator executing the run

  records        PayrollRecord[]

  // Multi-Tenant Isolation Boundary
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([tenantId, payPeriod]) // Prevents running payroll twice for the same calendar period
  @@index([tenantId, payPeriod])
}
Context-Driven Query Validation Rules
When processing data table queries or filter lookups through this console, the endpoint parses parameters based on the active tab context:

Invoices Context: Maps client status array selections (["Paid", "Pending"]) directly to invoice balance queries: Paid filters for outstandingAmount == 0, while Pending checks for outstandingAmount > 0.

Payroll Context: Filters records by employee deployment classes ("Faculty", "Admin", "Operations") by checking the associated role flags on the core employee profile record.

---

## 12. Student Invoice Management & Debt Aging Engine

Governs individual student balance ledgers, real-time collection reconciliation triggers, and cron-driven interest/aging penalty state routines.

### Real-Time Balance Optimization & Sync Logic
1. **The Collection Deduction Hook:** Every time a student payment is registered via the collections endpoint, an isolated database transaction must subtract that payment from `FeeInvoice.outstandingAmount`.
2. **State Transition Rules:**
   * If `outstandingAmount == 0`, the parent invoice status token transitions automatically to `PAID`.
   * If `outstandingAmount > 0` AND less than `totalAmount`, the status tag is marked as `PARTIAL`.
   * If `outstandingAmount > 0` AND the current date is past the maturity deadline (`dueDate`), an automated background task updates the token to `OVERDUE`.

### Database Schema Alignment

```prisma
enum InvoiceState {
  PAID
  PARTIAL
  OVERDUE
}

// Upgraded relational model mapping perfectly to the client Invoices Table
model FeeInvoice {
  id                String         @id @default(uuid())
  studentId         String
  student           Student        @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  feeCategory       String         // e.g., "Tuition & Core Academic", "Medical & Health Services"
  totalAmount       Decimal        @db.Decimal(10, 2)
  outstandingAmount Decimal        @db.Decimal(10, 2) // Saved internally to maintain high-speed index scanning
  status            InvoiceState   @default(PARTIAL)
  
  issueDate         DateTime
  dueDate           DateTime

  // Multi-Tenant Isolation Boundary
  tenantId          String
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([studentId])
  @@index([tenantId, status])
  @@index([dueDate])
}

---

## 13. Revenue Collection, Receipting, & Ledger Allocation Engine

Governs atomic payment intakes, immutable audit receipts, mobile money tracking keys, and categorical balance sheet routing.

### The Atomic Intake & Allocation Transaction Blueprint (`POST /api/finance/collections/receipt`)
When a payment is processed from the interface layer, the database coordinator wraps the execution inside an isolated write lock:
```text
START TRANSACTION
  1. Verify the targeted Student record exists and matches the active tenantId boundary.
  2. Write an immutable, unique row into the FeeReceipt table with a serialized timestamp.
  3. Query the active FeeInvoice line matched to the selected allocationPillar (e.g., "TUITION").
  4. Subtract the received amount directly from FeeInvoice.outstandingAmount.
  5. If an invoice line balance drops to 0, flip its status flag to "PAID".
COMMIT TRANSACTION
Relational Database Collection Extensions
Code snippet
enum PaymentProtocol {
  CASH
  BANK_TRANSFER
  MOMO
  CHEQUE
}

enum AllocationPillar {
  TUITION
  CATERING
  COMPUTER_LAB
  SCIENCE_LAB
  STATIONERY
  ARREARS
}

model FeeReceipt {
  id               String          @id @default(uuid())
  receiptNumber    String          // Generated serial number (e.g., REC-2026-8942)
  academicTier     String          // Tracked grade bracket index (e.g., "jhs-1")
  amount           Decimal         @db.Decimal(10, 2)
  method           PaymentProtocol @default(CASH)
  referenceKey     String?         // Stores external mobile money reference IDs or bank deposit slip numbers
  allocationPillar AllocationPillar @default(TUITION)
  dateProcessed    DateTime        @default(now())

  // Relational Integrity Ties
  studentId        String
  student          Student         @relation(fields: [studentId], references: [id], onDelete: Restrict)

  // Multi-Tenant Isolation Boundary
  tenantId         String
  tenant           Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt        DateTime        @default(now())

  @@unique([tenantId, receiptNumber])
  @@index([tenantId, academicTier])
  @@index([studentId])
}

---

## 14. Theme-Aware Financial Layouts & Client-Side State Caching

Specifies rules for adaptive user interfaces, multi-cohort state caching behaviors, and client-side view preservation protocols.

### Multi-Cohort State Retention Architecture
To protect temporary input fields from data loss during rapid tab-switching, client-side forms employ dictionary data structures matched to the core grade codes:
* **The State Cache Contract:** Rather than binding inputs to a single scalar variable, values are stored inside an object indexed by class keys: `formState[activeSection]`.
* **Render Mitigation Strategy:** Changing the active section indicator shifts the data source reference immediately. This setup avoids complete component remounts, protects input focus, and eliminates unnecessary re-renders across the form grid.

### Theme-Consistent Input Component Schemas
```typescript
// Unified client-side input element baseline configuration
export const baselineInputClasses = cn(
  "h-9 text-xs w-full rounded-md border bg-background px-3 outline-none transition-colors",
  "border-stone-200 text-stone-900 focus:border-stone-400 focus:ring-0",
  "dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-700"
)
Multi-Currency Decimal Normalization
While the interface renders clean localized string formats using native locale rules (GH₵ or $), the processing controller strictly sanitizes input text before dispatching transactions to the backend API:

Sanitization Regex: All non-numeric characters (including currency markers or commas) are stripped out: const rawDigits = amountString.replace(/[^0-9.]/g, '').

Precision Boxing: The resulting string value is parsed into a floating-point integer and converted to a safe base-10 numerical scale before being added to payload bodies. This prevents truncation errors when data hits the relational database storage layer.

---

## 15. Staff Payroll & General Ledger Double-Entry Engine

Governs multi-legged accounting transactions, automated payroll lifecycle states, immutable chart tracking nodes, and trial balance validation rules.

### The Double-Entry Balancing Transaction Pattern (`POST /api/finance/ledger/transaction`)
Every change to an institutional account must be recorded as a atomic transaction containing at least one debit line and one credit line:
```text
START TRANSACTION
  1. Calculate the total sum of all inbound Debit items inside the request body payload.
  2. Calculate the total sum of all inbound Credit items inside the request body payload.
  3. Validate that Total Debits strictly equal Total Credits (Delta == 0). Abort if unequal.
  4. Write parent JournalEntry header row linked securely to active tenantId boundaries.
  5. Commit child JournalLine items to update target LedgerAccount index values.
COMMIT TRANSACTION
Prisma Relational Schema Database Definitions
Code snippet
enum EmployeeRole {
  TEACHING
  ADMINISTRATION
  OPERATIONS_SUPPORT
}

enum DisbursalStatus {
  PENDING
  DISBURSED
}

enum AccountCategory {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model StaffPayroll {
  id            String          @id @default(uuid())
  employeeName  String
  role          EmployeeRole    @default(TEACHING)
  baseSalary    Decimal         @db.Decimal(10, 2)
  allowances    Decimal         @db.Decimal(10, 2) @default(0.00)
  deductions    Decimal         @db.Decimal(10, 2) @default(0.00)
  status        DisbursalStatus @default(PENDING)
  
  // Multi-Tenant Core Link
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([tenantId, status])
}

model LedgerAccount {
  id            String          @id @default(uuid())
  code          String          // e.g., "1010", "5010" (Unique per school tenant)
  accountName   String          // e.g., "Main Cash Operating Account"
  category      AccountCategory @default(EXPENSE)

  // System Tracking References
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journalLines  JournalLine[]

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId, category])
}

model JournalEntry {
  id            String          @id @default(uuid())
  referenceMemo String          // e.g., "June 2026 Academic Faculty Payroll Run"
  dateProcessed DateTime        @default(now())
  
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines         JournalLine[]

  createdAt     DateTime        @default(now())
}

model JournalLine {
  id               String        @id @default(uuid())
  amount           Decimal       @db.Decimal(10, 2)
  isDebit          Boolean       // True = Debit, False = Credit
  
  ledgerAccountId  String
  ledgerAccount    LedgerAccount @relation(fields: [ledgerAccountId], references: [id], onDelete: Restrict)
  journalEntryId   String
  journalEntry     JournalEntry  @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  @@index([ledgerAccountId])
  @@index([journalEntryId])
}

---

## 15. Staff Payroll & General Ledger Double-Entry Engine

Governs multi-legged accounting transactions, automated payroll lifecycle states, immutable chart tracking nodes, and trial balance validation rules.

### The Double-Entry Balancing Transaction Pattern (`POST /api/finance/ledger/transaction`)
Every change to an institutional account must be recorded as a atomic transaction containing at least one debit line and one credit line:
```text
START TRANSACTION
  1. Calculate the total sum of all inbound Debit items inside the request body payload.
  2. Calculate the total sum of all inbound Credit items inside the request body payload.
  3. Validate that Total Debits strictly equal Total Credits (Delta == 0). Abort if unequal.
  4. Write parent JournalEntry header row linked securely to active tenantId boundaries.
  5. Commit child JournalLine items to update target LedgerAccount index values.
COMMIT TRANSACTION
Prisma Relational Schema Database Definitions
Code snippet
enum EmployeeRole {
  TEACHING
  ADMINISTRATION
  OPERATIONS_SUPPORT
}

enum DisbursalStatus {
  PENDING
  DISBURSED
}

enum AccountCategory {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model StaffPayroll {
  id            String          @id @default(uuid())
  employeeName  String
  role          EmployeeRole    @default(TEACHING)
  baseSalary    Decimal         @db.Decimal(10, 2)
  allowances    Decimal         @db.Decimal(10, 2) @default(0.00)
  deductions    Decimal         @db.Decimal(10, 2) @default(0.00)
  status        DisbursalStatus @default(PENDING)
  
  // Multi-Tenant Core Link
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([tenantId, status])
}

model LedgerAccount {
  id            String          @id @default(uuid())
  code          String          // e.g., "1010", "5010" (Unique per school tenant)
  accountName   String          // e.g., "Main Cash Operating Account"
  category      AccountCategory @default(EXPENSE)

  // System Tracking References
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journalLines  JournalLine[]

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId, category])
}

model JournalEntry {
  id            String          @id @default(uuid())
  referenceMemo String          // e.g., "June 2026 Academic Faculty Payroll Run"
  dateProcessed DateTime        @default(now())
  
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines         JournalLine[]

  createdAt     DateTime        @default(now())
}

model JournalLine {
  id               String        @id @default(uuid())
  amount           Decimal       @db.Decimal(10, 2)
  isDebit          Boolean       // True = Debit, False = Credit
  
  ledgerAccountId  String
  ledgerAccount    LedgerAccount @relation(fields: [ledgerAccountId], references: [id], onDelete: Restrict)
  journalEntryId   String
  journalEntry     JournalEntry  @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  @@index([ledgerAccountId])
  @@index([journalEntryId])
}

---

## 16. Frontend Data Transmission Invariants & Batch Disbursal API Payload Contract

To guarantee precision-safe monetary conversions and eliminate rounding discrepancies prior to executing the double-entry database transaction, the client layout must adhere to strict serialization specifications.

### Floating-Point Prevention Protocol
JavaScript `Number` primitives (64-bit float) fail to accurately capture true currency fractions over repeated iterations. 
* All client state representations of monetary amounts (`baseSalary`, `allowances`, `deductions`) must be preserved as exact **strings** (`"8500.00"`) inside payload schemas.
* The frontend must forward raw, non-formatted string values to the route handler. Currency decorations (like `"GH₵"`) and locale formatting are applied strictly within the presentation layer wrapper.

### The Batch Disbursal Payload Schema (`POST /api/finance/payroll/disburse`)
When an administrative user selects multiple processing rows to clear through the ledger, the outbound JSON array follows this precise layout structure:

```json
{
  "payPeriod": "June 2026",
  "disbursalIds": [
    "PAY-2026-06-03",
    "PAY-2026-06-05"
  ]
}
Route Handler Processing Routine
Plaintext
START BATCH DISBURSAL MUTATION
  1. Parse the incoming request payload and extract the `disbursalIds` array.
  2. Instantiate a safe isolation lock via a Prisma `$transaction` database pipeline.
  3. Query the target `StaffPayroll` rows matching the provided primary key indices.
  4. Guard check: Verify each row's internal state is explicitly configured as `PENDING`. Abort if any line is already marked `DISBURSED` to prevent double-liquidation loops.
  5. Accumulate the absolute total distribution aggregate using a string-backed numeric library (e.g., `Decimal.js` or standard `BigInt` scaling).
  6. Execute a multi-legged journal entry:
     - Debit the consolidated operating expenditure allocation total into the designated `EXPENSE` account node.
     - Credit the exact offsetting amount to the active institutional liquidity `ASSET` ledger profile.
  7. Transition the status flag of all target `StaffPayroll` records to `DISBURSED`.
COMMIT BATCH DISBURSAL MUTATION

---

## 17. URL-Driven Client View Synchronization (Search Parameter Routing)

To prevent client-side state loss during unexpected page refreshes and support direct deep-linking across distinct administrative sub-views, interface layout toggles must be synchronized directly with the URL search parameters rather than relying purely on isolated `useState` hooks.

### Next.js Search Parameters & Suspense Boundary Invariants
Reading layout states directly from the URL requires strict safety handling within Next.js App Router applications to ensure clean rendering:
* **The Suspense Requirement:** Any component utilizing Next.js navigation primitives like `useSearchParams()` must be wrapped inside a `<React.Suspense>` boundary. Failing to isolate these components can accidentally force the entire layout parent wrapper into a slow, client-side single-page render loop during build time.
* **Non-Blocking View Transitions:** Updates to the URL string must execute with scrolling disabled (`{ scroll: false }`) to ensure the view switches instantly without forcing the browser window to snap back to the top of the viewport.

### Implementation Blueprint & URL State Contract
```text
[User Clicks Toggle Switch]
         │
         ▼
1. Extract active URLSearchParams string clone via `searchParams.toString()`.
2. Evaluate Boolean state check (e.g., `checked === true`).
3. Mutate target search param token key value (`params.set(paramKey, activeValue)`).
4. Flush updated query string to history matrix cleanly via `router.push()`.
         │
         ▼
[Next.js App Router intercepts URL change and re-renders the localized view branch]

---

## 18. Workforce Infrastructure & Staff Contractual Governance Schema

Governs institutional human resource tenures, legal compliance states, engagement classifications, and automatic temporal lifecycle transitions.

### Contract State Lifecycles
Staff tenures are tracked through a deterministic sequence across three explicit tracking states:
* `ACTIVE`: Fully executed legal contracts within valid operational timeline boundaries.
* `PROBATIONARY`: Early-stage review contracts subject to structural evaluation.
* `PENDING_RENEWAL`: Contracts currently within or past their expiration threshold (`expirationDate <= current_date`) requiring administrative execution.

### Prisma Relational Schema Definitions

```prisma
enum RoleTier {
  ACADEMIC_FACULTY
  EXECUTIVE_ADMINISTRATION
  OPERATIONAL_SUPPORT
}

enum TermType {
  FULL_TIME_PERMANENT
  FIXED_TERM_ACADEMIC_YEAR
  SESSIONAL_PART_TIME
}

enum ContractStatus {
  ACTIVE
  PROBATIONARY
  PENDING_RENEWAL
}

model StaffContract {
  id               String         @id @default(uuid())
  employeeName     String
  designation      String         // e.g., "Senior Mathematics Master"
  tier             RoleTier       @default(ACADEMIC_FACULTY)
  termType         TermType       @default(FULL_TIME_PERMANENT)
  baseRemuneration Decimal        @db.Decimal(10, 2)
  commencementDate DateTime       @db.Date
  expirationDate   DateTime       @db.Date
  status           ContractStatus @default(PROBATIONARY)

  // Multi-Tenant Core Link
  tenantId         String
  tenant           Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([tenantId, tier])
  @@index([tenantId, status])
  @@index([expirationDate])
}
Temporal Cron Auditing Loop (cron/check-contract-expiry)
An automated system cron job executes nightly to transition contracts exceeding their valid lifecycle parameters into the renewal queue:

Plaintext
UPDATE StaffContract
SET status = 'PENDING_RENEWAL'
WHERE status = 'ACTIVE' 
  AND expirationDate <= CURRENT_DATE;

---

## 19. Staff Registry Query Scopes & Dynamic Filtration Routing

Governs dynamic, client-driven filter normalization matrices, compound database indexing strategies for HR registries, and multi-field criteria building rules.

### Dynamic Filter Normalization & SQL Layer Isolation
Before client-side search objects are dispatched across API boundaries, empty array entries, blank input characters, or unselected toggle values are strictly flattened:
* **The Compaction Invariant:** `Object.fromEntries` strips out empty strings (`""`) or missing keys (`null`), shielding backend route engines from parsing incomplete predicate blocks.
* **Prisma Dynamic Predicate Compilation:** Sanitized parameters map directly onto optional property wrappers inside database queries (`where` statements) to build dynamic search paths safely:

```typescript
const whereClause: Prisma.StaffProfileWhereInput = {
  tenantId,
  ...(filters.employmentStatus?.length && { status: { in: filters.employmentStatus } }),
  ...(filters.employmentType && { engagementType: filters.employmentType }),
  ...(filters.department && { department: filters.department }),
  ...(filters.minExperience && { tenureYears: { gte: parseInt(filters.minExperience, 10) } }),
};
Relational Search Optimizations & Indexes
To ensure fast searches across high-density employee registries, tables require a compound multi-column design:

Code snippet
model StaffProfile {
  id             String           @id @default(uuid())
  status         String           // Active, On Leave, Suspended, Terminated
  engagementType String           // Full-Time, Part-Time, Contract, Visiting Faculty
  department     String           // Cost Center Department Label
  tenureYears    Int              @default(0)

  tenantId       String
  tenant         Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, department, status])
  @@index([tenantId, engagementType])
}

---

## 20. Student Academic Analytics Sub-Ledger Domain Matrix

Governs real-time GPA tracking metrics, calculated overall grade point averages, class rankings, attendance ratios, and automatic academic standing transitions.

### Real-Time Metric Aggregation & Rules
1. **The Standing Invariant Layer:** A student profile's internal `academicStanding` attribute is bound to systemic logic gates rather than static data overrides:
   * If `failedCourses >= 2` OR `currentGpa < 2.00` OR `attendanceRate < 75`, the status changes to `PROBATION`.
   * Otherwise, the status transitions automatically to `GOOD_STANDING`.
2. **Dynamic Ranking Engines:** Class rankings (`classRank`) are computed dynamically on the server across localized section buckets (`classSectionId`) by sorting overall average metrics chronologically or down a descending floating-point index.

### Database Schema Alignment

```prisma
enum AcademicStanding {
  GOOD_STANDING
  PROBATION
  SUSPENDED
}

model StudentAcademicRecord {
  id               String           @id @default(uuid())
  studentId        String           @unique
  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  currentGpa       Decimal          @db.Decimal(3, 2) @default(0.00)
  overallAverage   Int              @default(0) // Integer value tracking percentage marks (0-100)
  creditsEarned    Int              @default(0)
  failedCourses    Int              @default(0)
  attendanceRate   Int              @default(100) // Percentage integer tracking presence logs
  classRank        Int              @default(0)
  academicStanding AcademicStanding @default(GOOD_STANDING)

  // Multi-Tenant Isolation Boundary
  tenantId         String
  tenant           Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([tenantId, academicStanding])
  @@index([tenantId, overallAverage(sort: Desc)])
}

---

## 21. Student Accounts Receivable & Financial Ledger Integration

Governs the tracking of student-level liabilities, fee settlement workflows, and automated financial status transitions.

### Ledger Balancing Logic
The `feeBalance` variable must act as a derived aggregate, calculated by subtracting the sum of all confirmed `PaymentReceipt` records from the baseline `TuitionCharge` record:

```typescript
// Calculation pattern for the service layer:
const balance = totalTuitionDue - totalPaymentsReceived;
Prisma Relational Schema Integration
Code snippet
model StudentFinance {
  id               String   @id @default(uuid())
  studentId        String   @unique
  student          Student  @relation(fields: [studentId], references: [id])
  
  // Financial State
  totalTuitionDue  Decimal  @db.Decimal(12, 2)
  amountPaid       Decimal  @db.Decimal(12, 2) @default(0.00)
  
  // Computed balance field for query performance
  outstanding      Decimal  @default(dbgenerated("totalTuitionDue - amountPaid"))
  
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id])

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([tenantId, outstanding])
}
Financial Audit Workflow
Settlement State: When outstanding reaches 0.00, the system automatically triggers an update to the student's AcademicAccessStatus.

Proactive Collection: Querying the outstanding index allows for real-time generation of "Aged Debt Reports," grouping students by their overdue duration.

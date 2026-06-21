import { authenticateRequest, RequestContext } from '../../shared/context';
import { FinanceCatalogEngine } from './catalog';

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  studentId: string;
  amountDue: number;
  amountPaid: number;
  status: InvoiceStatus;
  issuedAt: string;
}

export class InvoiceGenerationEngine {
  private invoiceDb: Map<string, InvoiceRecord> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string, private catalogEngine: FinanceCatalogEngine) {}

  public generateStudentInvoice(
    authHeader: string | undefined,
    studentId: string
  ): { success: boolean; data?: InvoiceRecord; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to issue invoices.` };
    }

    const billingLayout = this.catalogEngine.getStudentBillingBreakdown(studentId);
    if (!billingLayout) {
      return { success: false, error: `Billing Failure: No fee tier assignment found for student '${studentId}'.` };
    }

    if (billingLayout.tenantId !== context.tenantId) {
      return { success: false, error: 'Critical Security Alert: Cross-tenant data leak intercepted during statement compilation.' };
    }

    const invoiceId = `inv_bill_${this.incrementId++}`;
    const newInvoice: InvoiceRecord = {
      id: invoiceId,
      tenantId: context.tenantId,
      studentId,
      amountDue: billingLayout.totalBreakdown,
      amountPaid: 0,
      status: 'UNPAID',
      issuedAt: new Date().toISOString().split('T')[0]
    };

    this.invoiceDb.set(invoiceId, newInvoice);
    console.log(`  -> [Invoice Emitted] Generated statement ${invoiceId} for student ${studentId}. Due: $${newInvoice.amountDue}`);
    return { success: true, data: newInvoice };
  }

  public getInvoice(invoiceId: string): InvoiceRecord | undefined {
    return this.invoiceDb.get(invoiceId);
  }

  public getAllInvoicesForReporting(): InvoiceRecord[] {
    return Array.from(this.invoiceDb.values());
  }
}

import { authenticateRequest, RequestContext } from '../../shared/context';
import { InvoiceGenerationEngine, InvoiceRecord } from './invoice';

export interface PaymentCollectionRecord {
  id: string;
  tenantId: string;
  invoiceId: string;
  amountPaid: number;
  transactionRef: string;
  collectedAt: string;
}

export class PaymentCollectionsEngine {
  private collectionsDb: Map<string, PaymentCollectionRecord> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string, private invoiceEngine: InvoiceGenerationEngine) {}

  public collectPayment(
    authHeader: string | undefined,
    invoiceId: string,
    amount: number,
    transactionRef: string
  ): { success: boolean; data?: PaymentCollectionRecord; outstandingBalance?: number; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] lacks authority to post payments.` };
    }

    const invoice = this.invoiceEngine.getInvoice(invoiceId);
    if (!invoice) {
      return { success: false, error: `Processing Error: Target invoice '${invoiceId}' does not exist.` };
    }

    if (invoice.tenantId !== context.tenantId) {
      return { success: false, error: 'Critical Security Alert: Cross-tenant payment parsing intercepted and denied.' };
    }

    const remainingToPay = invoice.amountDue - invoice.amountPaid;
    if (remainingToPay <= 0) {
      return { success: false, error: `Accounting Error: Invoice '${invoiceId}' is already completely settled.` };
    }

    console.log(`[Treasury Processing] Applying payment of $${amount} against invoice ${invoiceId} (Ref: ${transactionRef})...`);

    invoice.amountPaid += amount;
    
    if (invoice.amountPaid >= invoice.amountDue) {
      invoice.status = 'PAID';
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'PARTIALLY_PAID';
    }

    const collectionId = `tx_ledger_${this.incrementId++}`;
    const collectionRecord: PaymentCollectionRecord = {
      id: collectionId,
      tenantId: context.tenantId,
      invoiceId,
      amountPaid: amount,
      transactionRef,
      collectedAt: new Date().toISOString().split('T')[0]
    };

    this.collectionsDb.set(collectionId, collectionRecord);
    const finalOutstanding = invoice.amountDue - invoice.amountPaid;

    return {
      success: true,
      data: collectionRecord,
      outstandingBalance: finalOutstanding >= 0 ? finalOutstanding : 0
    };
  }
}

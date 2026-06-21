import { authenticateRequest, RequestContext } from '../../shared/context';
import { InvoiceRecord } from './invoice';

export interface RevenueMetricsSummary {
  tenantId: string;
  totalGrossRevenueCollected: number;
  totalOutstandingReceivables: number;
  invoiceStatusBreakdown: {
    unpaidCount: number;
    partiallyPaidCount: number;
    paidCount: number;
  };
}

export class FinanceDashboardEngine {
  constructor(private jwtSecret: string, private invoiceEngine: any) {}

  public compileExecutiveMetrics(authHeader: string | undefined): { success: boolean; metrics?: RevenueMetricsSummary; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to view executive financial insights.` };
    }

    let totalGrossRevenueCollected = 0;
    let totalOutstandingReceivables = 0;
    let unpaidCount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;

    const allInvoices: InvoiceRecord[] = this.invoiceEngine.getAllInvoicesForReporting();
    const tenantInvoices = allInvoices.filter(inv => inv.tenantId === context.tenantId);

    for (const invoice of tenantInvoices) {
      totalGrossRevenueCollected += invoice.amountPaid;
      
      const outstandingDebt = invoice.amountDue - invoice.amountPaid;
      if (outstandingDebt > 0) {
        totalOutstandingReceivables += outstandingDebt;
      }

      if (invoice.status === 'UNPAID') unpaidCount++;
      if (invoice.status === 'PARTIALLY_PAID') partiallyPaidCount++;
      if (invoice.status === 'PAID') paidCount++;
    }

    return {
      success: true,
      metrics: {
        tenantId: context.tenantId,
        totalGrossRevenueCollected,
        totalOutstandingReceivables,
        invoiceStatusBreakdown: {
          unpaidCount,
          partiallyPaidCount,
          paidCount
        }
      }
    };
  }
}

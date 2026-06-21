import { authenticateRequest, RequestContext } from '../../shared/context';

export interface FeeTier {
  id: string;
  tenantId: string;
  name: string;
  baseTuition: number;
  facilityLevy: number;
  techFee: number;
  totalBreakdown: number;
}

export class FinanceCatalogEngine {
  private tierCatalog: Map<string, FeeTier> = new Map();
  private studentAssignments: Map<string, string> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string) {}

  public createFeeTier(
    authHeader: string | undefined,
    name: string,
    baseTuition: number,
    facilityLevy: number,
    techFee: number
  ): { success: boolean; data?: FeeTier; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] lacks mutation clearance to configure fee tiers.` };
    }

    const totalBreakdown = baseTuition + facilityLevy + techFee;
    const tierId = `tier_${this.incrementId++}`;

    const newTier: FeeTier = {
      id: tierId,
      tenantId: context.tenantId,
      name,
      baseTuition,
      facilityLevy,
      techFee,
      totalBreakdown
    };

    this.tierCatalog.set(tierId, newTier);
    console.log(`  -> [Catalog Ledger] Created tier ${tierId} (${name}) for tenant ${context.tenantId}. Total: Billed $${totalBreakdown}`);
    return { success: true, data: newTier };
  }

  public assignStudentToTier(
    authHeader: string | undefined,
    studentId: string,
    tierId: string
  ): { success: boolean; message?: string; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: 'RBAC Violation: Unauthorized operational assignment access.' };
    }

    const targetTier = this.tierCatalog.get(tierId);
    if (!targetTier) {
      return { success: false, error: `Lookup Error: Billing tier '${tierId}' not found inside active records.` };
    }

    if (targetTier.tenantId !== context.tenantId) {
      return { success: false, error: 'Critical Security Alert: Cross-tenant ledger assignment rejected.' };
    }

    this.studentAssignments.set(studentId, tierId);
    console.log(`  -> [Assignment Registered] Student ${studentId} bound to financial billing layout ${tierId}`);
    return { success: true, message: `Student mapped successfully to ${targetTier.name}.` };
  }

  public getStudentBillingBreakdown(studentId: string): FeeTier | undefined {
    const tierId = this.studentAssignments.get(studentId);
    if (!tierId) return undefined;
    return this.tierCatalog.get(tierId);
  }
}

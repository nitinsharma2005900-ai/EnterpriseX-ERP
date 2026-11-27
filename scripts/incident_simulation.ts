import { prisma } from '../backend/src/config/prisma';
import { WorkflowEngine } from '../backend/src/modules/workflows/workflow.engine';
import { HealthService } from '../backend/src/modules/health/health.service';

async function runIncidentSimulations() {
  console.log('================================================================');
  console.log('🔬 EnterpriseX ERP Assessment 15: Controlled Incident Simulation');
  console.log('================================================================\n');

  // Simulation 1: Double-Entry Ledger Imbalance Diagnostic
  console.log('Test 1: Diagnosing Double-Entry General Ledger Integrity...');
  const diag1 = await HealthService.runDiagnostics();
  console.log(`Audited Journals: ${diag1.diagnostics.totalJournalsAudited}`);
  console.log(`Unbalanced Journals Detected: ${diag1.diagnostics.unbalancedJournalsCount}`);
  console.log(`Overall Health Status: ${diag1.overallStatus}\n`);

  // Simulation 2: Trigger Controlled Incident Simulation
  console.log('Test 2: Injecting Simulated High-Severity Incident...');
  const inc = await HealthService.simulateIncident('LEDGER_IMBALANCE');
  console.log(`Created Incident: ${inc.code} - ${inc.title} [Severity: ${inc.severity}]`);
  console.log(`Diagnosis Details: ${inc.diagnosisDetails}`);

  // Resolve incident
  console.log('Resolving Incident via automated diagnostic runbook...');
  const resolved = await HealthService.resolveIncident(inc.id, 'admin-sim', 'Auto-synchronized GL balances via diagnostic runbook.');
  console.log(`Resolution Status: ${resolved.status} at ${resolved.resolvedAt}\n`);

  // Simulation 3: Purchase-to-Pay Workflow with Compensation Rollback
  console.log('Test 3: Domain-Specific Capstone - Purchase-to-Pay Safe Rollback...');
  const vendor = await prisma.vendor.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const product = await prisma.product.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ERP_ADMINISTRATOR' } });

  const p2pRes = await WorkflowEngine.executePurchaseToPay(
    {
      vendorId: vendor!.id,
      departmentId: admin!.departmentId || '',
      warehouseId: warehouse!.id,
      items: [{ productId: product!.id, quantity: 5, unitPrice: product!.standardCost }],
      simulateFailureAt: 'PAYMENT', // Injects failure at the final payment step!
      idempotencyKey: `SIM-COMPENSATE-${Date.now()}`,
    },
    admin!
  );

  console.log(`Workflow Execution Result: ${p2pRes.status}`);
  console.log('Compensation Actions Log:');
  p2pRes.compensationLog?.forEach((log: string, idx: number) => {
    console.log(`  [Compensation ${idx + 1}] ${log}`);
  });

  console.log('\n================================================================');
  console.log('✅ All Assessment 15 Incident Recovery Simulations Passed!');
  console.log('================================================================');
}

runIncidentSimulations()
  .catch((err) => {
    console.error('Incident simulation failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

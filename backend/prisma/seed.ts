import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EnterpriseX ERP Comprehensive Seed...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'EX-CORP' },
    update: {},
    create: {
      code: 'EX-CORP',
      name: 'EnterpriseX Global Holdings Inc.',
      taxId: 'US-987654321',
      currency: 'USD',
    },
  });

  // 2. Branches
  const branchHQ = await prisma.branch.upsert({
    where: { code: 'BR-NA-01' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'BR-NA-01',
      name: 'North American Corporate HQ',
      address: '100 Enterprise Way, Suite 500, Chicago, IL 60601',
    },
  });

  const branchEU = await prisma.branch.upsert({
    where: { code: 'BR-EU-02' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'BR-EU-02',
      name: 'European Logistics Hub',
      address: 'De Entree 250, 1101 EE Amsterdam, Netherlands',
    },
  });

  // 3. Departments
  const depExec = await prisma.department.upsert({
    where: { code: 'DEP-EXEC' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'DEP-EXEC',
      name: 'Executive & Governance',
      budget: 500000.0,
    },
  });

  const depFin = await prisma.department.upsert({
    where: { code: 'DEP-FIN' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'DEP-FIN',
      name: 'Finance & Treasury',
      budget: 350000.0,
    },
  });

  const depProc = await prisma.department.upsert({
    where: { code: 'DEP-PROC' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'DEP-PROC',
      name: 'Procurement & Strategic Sourcing',
      budget: 850000.0,
    },
  });

  const depWH = await prisma.department.upsert({
    where: { code: 'DEP-WH' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'DEP-WH',
      name: 'Supply Chain & Warehousing',
      budget: 600000.0,
    },
  });

  const depSales = await prisma.department.upsert({
    where: { code: 'DEP-SALES' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'DEP-SALES',
      name: 'Commercial Enterprise Sales',
      budget: 400000.0,
    },
  });

  // 4. Warehouses
  const whCDC = await prisma.warehouse.upsert({
    where: { code: 'WH-CDC-01' },
    update: {},
    create: {
      branchId: branchHQ.id,
      code: 'WH-CDC-01',
      name: 'Central Distribution Center (CDC)',
      location: 'Warehouse District B-4, Chicago, IL',
      active: true,
    },
  });

  const whWCL = await prisma.warehouse.upsert({
    where: { code: 'WH-WCL-02' },
    update: {},
    create: {
      branchId: branchHQ.id,
      code: 'WH-WCL-02',
      name: 'West Coast Logistics Depot',
      location: 'Logistics Parkway 88, Reno, NV',
      active: true,
    },
  });

  // 5. Seed Demo Users for all 6 Roles
  const passwordHash = await bcrypt.hash('EnterpriseX2026!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@enterprisex.com' },
    update: { passwordHash, approvalLimit: 1000000.0 },
    create: {
      email: 'admin@enterprisex.com',
      passwordHash,
      fullName: 'Alexandra Vance (ERP Admin)',
      role: 'ERP_ADMINISTRATOR',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depExec.id,
      approvalLimit: 1000000.0,
    },
  });

  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@enterprisex.com' },
    update: { passwordHash, approvalLimit: 250000.0 },
    create: {
      email: 'finance@enterprisex.com',
      passwordHash,
      fullName: 'Marcus Sterling (Finance Officer)',
      role: 'FINANCE_OFFICER',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depFin.id,
      approvalLimit: 250000.0,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@enterprisex.com' },
    update: { passwordHash, approvalLimit: 50000.0 },
    create: {
      email: 'manager@enterprisex.com',
      passwordHash,
      fullName: 'Elena Rostova (Department Manager)',
      role: 'DEPARTMENT_MANAGER',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depProc.id,
      approvalLimit: 50000.0,
    },
  });

  const procurementUser = await prisma.user.upsert({
    where: { email: 'procurement@enterprisex.com' },
    update: { passwordHash, approvalLimit: 10000.0 },
    create: {
      email: 'procurement@enterprisex.com',
      passwordHash,
      fullName: 'David Chen (Procurement Specialist)',
      role: 'PROCUREMENT_OFFICER',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depProc.id,
      approvalLimit: 10000.0,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: 'warehouse@enterprisex.com' },
    update: { passwordHash, approvalLimit: 0.0 },
    create: {
      email: 'warehouse@enterprisex.com',
      passwordHash,
      fullName: 'Tomas Kowalski (Warehouse Lead)',
      role: 'WAREHOUSE_OPERATOR',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depWH.id,
      warehouseId: whCDC.id,
      approvalLimit: 0.0,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@enterprisex.com' },
    update: { passwordHash, approvalLimit: 5000.0 },
    create: {
      email: 'sales@enterprisex.com',
      passwordHash,
      fullName: 'Sophia Martinez (Senior Account Exec)',
      role: 'SALES_USER',
      organizationId: org.id,
      branchId: branchHQ.id,
      departmentId: depSales.id,
      approvalLimit: 5000.0,
    },
  });

  // 6. Chart of Accounts
  const accountsData = [
    { code: '1010', name: 'Operating Cash Account', category: 'ASSET', subcategory: 'CURRENT_ASSET', balance: 150000.0 },
    { code: '1200', name: 'Trade Accounts Receivable', category: 'ASSET', subcategory: 'AR', balance: 45000.0 },
    { code: '1400', name: 'Finished Goods Inventory', category: 'ASSET', subcategory: 'CURRENT_ASSET', balance: 85000.0 },
    { code: '1500', name: 'Equipment & Hardware Infrastructure', category: 'ASSET', subcategory: 'FIXED_ASSET', balance: 220000.0 },
    { code: '2010', name: 'Trade Accounts Payable', category: 'LIABILITY', subcategory: 'AP', balance: 35000.0 },
    { code: '2200', name: 'Accrued Sales & VAT Taxes', category: 'LIABILITY', subcategory: 'CURRENT_LIABILITY', balance: 8500.0 },
    { code: '3010', name: 'Common Stock Capital', category: 'EQUITY', subcategory: 'EQUITY', balance: 300000.0 },
    { code: '3020', name: 'Retained Earnings', category: 'EQUITY', subcategory: 'EQUITY', balance: 106500.0 },
    { code: '4010', name: 'Commercial Hardware Revenue', category: 'REVENUE', subcategory: 'REVENUE', balance: 120000.0 },
    { code: '5010', name: 'Cost of Goods Sold (COGS)', category: 'EXPENSE', subcategory: 'COGS', balance: 60000.0 },
    { code: '6010', name: 'General & Administrative Expenses', category: 'EXPENSE', subcategory: 'OPEX', balance: 18000.0 },
    { code: '6020', name: 'Logistics & Warehousing Freight', category: 'EXPENSE', subcategory: 'OPEX', balance: 12000.0 },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: { balance: acc.balance },
      create: acc,
    });
  }

  // 7. Financial Periods
  const currentPeriod = await prisma.financialPeriod.upsert({
    where: { name: 'FY2026-Q1' },
    update: {},
    create: {
      name: 'FY2026-Q1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      status: 'OPEN',
    },
  });

  await prisma.financialPeriod.upsert({
    where: { name: 'FY2025-Q4' },
    update: {},
    create: {
      name: 'FY2025-Q4',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-12-31'),
      status: 'CLOSED',
      closedAt: new Date('2026-01-05'),
      closedBy: financeUser.id,
    },
  });

  // 8. Initial Balancing Journal Entry
  const cashAcc = await prisma.account.findUnique({ where: { code: '1010' } });
  const revAcc = await prisma.account.findUnique({ where: { code: '4010' } });

  if (cashAcc && revAcc) {
    const existingJE = await prisma.journalEntry.findUnique({ where: { entryNumber: 'JE-2026-0001' } });
    if (!existingJE) {
      await prisma.journalEntry.create({
        data: {
          entryNumber: 'JE-2026-0001',
          periodId: currentPeriod.id,
          referenceType: 'MANUAL',
          description: 'Q1 Opening cash and commercial billing recognition',
          status: 'POSTED',
          createdById: financeUser.id,
          lines: {
            create: [
              { accountId: cashAcc.id, debit: 25000.0, credit: 0.0, description: 'Debit Operating Cash' },
              { accountId: revAcc.id, debit: 0.0, credit: 25000.0, description: 'Credit Commercial Revenue' },
            ],
          },
        },
      });
    }
  }

  // 9. Vendors
  const vendor1 = await prisma.vendor.upsert({
    where: { code: 'VND-001' },
    update: {},
    create: {
      code: 'VND-001',
      name: 'Apex Industrial Supplies',
      email: 'orders@apexindustrial.com',
      phone: '+1 (312) 555-0199',
      address: '450 Industrial Parkway, Gary, IN',
      paymentTerms: 'NET30',
      rating: 4.8,
      balance: 12500.0,
      status: 'ACTIVE',
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { code: 'VND-002' },
    update: {},
    create: {
      code: 'VND-002',
      name: 'Global Logistics Corp',
      email: 'dispatch@globallogistics.com',
      phone: '+1 (415) 555-8822',
      address: '1200 Terminal Way, Oakland, CA',
      paymentTerms: 'NET15',
      rating: 4.6,
      balance: 8400.0,
      status: 'ACTIVE',
    },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { code: 'VND-003' },
    update: {},
    create: {
      code: 'VND-003',
      name: 'Precision Fasteners Ltd',
      email: 'sales@precisionfasteners.com',
      phone: '+1 (216) 555-3344',
      address: '890 Machining Rd, Cleveland, OH',
      paymentTerms: 'NET30',
      rating: 4.7,
      balance: 4200.0,
      status: 'ACTIVE',
    },
  });

  // 10. Customers
  const customer1 = await prisma.customer.upsert({
    where: { code: 'CUST-001' },
    update: {},
    create: {
      code: 'CUST-001',
      name: 'Nexus Dynamics International',
      email: 'ap@nexusdynamics.io',
      phone: '+1 (212) 555-9011',
      address: '750 Lexington Ave, 22nd Fl, New York, NY',
      creditLimit: 75000.0,
      outstandingBalance: 18500.0,
      paymentTerms: 'NET30',
      status: 'ACTIVE',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { code: 'CUST-002' },
    update: {},
    create: {
      code: 'CUST-002',
      name: 'Titanium Aerospace Works',
      email: 'procure@titaniumaero.com',
      phone: '+1 (206) 555-4477',
      address: '400 Aviation Blvd, Seattle, WA',
      creditLimit: 120000.0,
      outstandingBalance: 24000.0,
      paymentTerms: 'NET30',
      status: 'ACTIVE',
    },
  });

  // 11. Products & Stock
  const productsData = [
    {
      sku: 'SKU-SERV-100',
      name: 'Industrial Rack Server X1',
      description: 'Enterprise 2U dual-processor server unit for mission-critical automation',
      category: 'HARDWARE',
      uom: 'PCS',
      unitPrice: 1450.0,
      standardCost: 820.0,
      reorderPoint: 8.0,
      cdcQty: 25.0,
      wclQty: 10.0,
    },
    {
      sku: 'SKU-MOT-200',
      name: 'High-Torque Brushless Motor 48V',
      description: 'Precision brushless motor for robotic conveyors and automation drives',
      category: 'ELECTRONICS',
      uom: 'PCS',
      unitPrice: 320.0,
      standardCost: 175.0,
      reorderPoint: 15.0,
      cdcQty: 60.0,
      wclQty: 30.0,
    },
    {
      sku: 'SKU-SENS-300',
      name: 'Precision Optical Sensor Array',
      description: 'Multi-spectrum optical telemetry sensor for line inspection',
      category: 'SENSORS',
      uom: 'PCS',
      unitPrice: 185.0,
      standardCost: 95.0,
      reorderPoint: 20.0,
      cdcQty: 80.0,
      wclQty: 40.0,
    },
    {
      sku: 'SKU-CAB-400',
      name: 'Armored Fiber Optic Cable 50m',
      description: 'Heavy-duty armored fiber spool for industrial plant networking',
      category: 'CABLING',
      uom: 'BOX',
      unitPrice: 95.0,
      standardCost: 48.0,
      reorderPoint: 30.0,
      cdcQty: 120.0,
      wclQty: 50.0,
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { unitPrice: p.unitPrice, standardCost: p.standardCost },
      create: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        uom: p.uom,
        unitPrice: p.unitPrice,
        standardCost: p.standardCost,
        reorderPoint: p.reorderPoint,
      },
    });

    // CDC Warehouse Stock
    await prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: { productId: product.id, warehouseId: whCDC.id },
      },
      update: { quantityOnHand: p.cdcQty },
      create: {
        productId: product.id,
        warehouseId: whCDC.id,
        quantityOnHand: p.cdcQty,
        quantityReserved: 0.0,
        averageCost: p.standardCost,
      },
    });

    // WCL Warehouse Stock
    await prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: { productId: product.id, warehouseId: whWCL.id },
      },
      update: { quantityOnHand: p.wclQty },
      create: {
        productId: product.id,
        warehouseId: whWCL.id,
        quantityOnHand: p.wclQty,
        quantityReserved: 0.0,
        averageCost: p.standardCost,
      },
    });
  }

  // 12. Seed an initial Purchase Order & GRN for demonstration
  const p1 = await prisma.product.findUnique({ where: { sku: 'SKU-SERV-100' } });
  const p2 = await prisma.product.findUnique({ where: { sku: 'SKU-MOT-200' } });

  if (p1 && p2) {
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber: 'PO-2026-0001' } });
    if (!existingPO) {
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-2026-0001',
          vendorId: vendor1.id,
          departmentId: depProc.id,
          requestedById: procurementUser.id,
          approvedById: managerUser.id,
          status: 'COMPLETED',
          netAmount: 11700.0,
          taxAmount: 1170.0,
          totalAmount: 12870.0,
          approvalNotes: 'Approved for Q1 CDC restocking plan',
          items: {
            create: [
              {
                productId: p1.id,
                quantityOrdered: 10,
                quantityReceived: 10,
                unitPrice: 820.0,
                taxRate: 0.10,
                subtotal: 8200.0,
                totalAmount: 9020.0,
              },
              {
                productId: p2.id,
                quantityOrdered: 20,
                quantityReceived: 20,
                unitPrice: 175.0,
                taxRate: 0.10,
                subtotal: 3500.0,
                totalAmount: 3850.0,
              },
            ],
          },
        },
        include: { items: true },
      });

      // GRN
      const grn = await prisma.goodsReceipt.create({
        data: {
          grnNumber: 'GRN-2026-0001',
          poId: po.id,
          warehouseId: whCDC.id,
          receivedById: warehouseUser.id,
          status: 'POSTED',
          carrier: 'Midwest Freight Lines',
          trackingNumber: 'TRK-9928172',
          items: {
            create: [
              {
                poItemId: po.items[0].id,
                productId: p1.id,
                quantityReceived: 10,
                quantityAccepted: 10,
                unitCost: 820.0,
                batchNumber: 'BATCH-2026-A1',
              },
              {
                poItemId: po.items[1].id,
                productId: p2.id,
                quantityReceived: 20,
                quantityAccepted: 20,
                unitCost: 175.0,
                batchNumber: 'BATCH-2026-A2',
              },
            ],
          },
        },
      });

      // Invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-AP-2026-0001',
          type: 'ACCOUNTS_PAYABLE',
          vendorId: vendor1.id,
          poId: po.id,
          grnId: grn.id,
          status: 'PAID',
          subtotal: 11700.0,
          taxAmount: 1170.0,
          totalAmount: 12870.0,
          paidAmount: 12870.0,
          remainingAmount: 0.0,
          dueDate: new Date('2026-04-15'),
          matchStatus: 'MATCHED',
          items: {
            create: [
              { productId: p1.id, description: '10x Industrial Rack Server X1', quantity: 10, unitPrice: 820.0, taxRate: 0.10, amount: 9020.0 },
              { productId: p2.id, description: '20x Brushless Motor 48V', quantity: 20, unitPrice: 175.0, taxRate: 0.10, amount: 3850.0 },
            ],
          },
        },
      });

      // Payment
      await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-2026-0001',
          invoiceId: invoice.id,
          amount: 12870.0,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'WIRE-US-991823',
          status: 'COMPLETED',
          idempotencyKey: 'SEED-PAY-0001',
          notes: 'Full settlement of INV-AP-2026-0001',
        },
      });
    }
  }

  // 13. System Incident Seed
  await prisma.systemIncident.upsert({
    where: { code: 'INC-2026-001' },
    update: {},
    create: {
      code: 'INC-2026-001',
      title: 'Legacy Batch Sync Divergence Mitigated',
      severity: 'LOW',
      status: 'RESOLVED',
      module: 'FINANCE',
      diagnosisDetails: 'Automated diagnostic detected micro-divergence in historical staging ledger.',
      rootCause: 'Transient network failure during legacy CSV bulk import.',
      resolutionAction: 'Automated reconciliation script synchronized ledger balances successfully.',
      resolvedBy: adminUser.id,
      resolvedAt: new Date(),
    },
  });

  console.log('✅ EnterpriseX ERP Seed Complete! 6 Demo users, COA, inventory, vendors, and sample transactions ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

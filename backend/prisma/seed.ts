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
      update: {},
      create: { ...acc, balance: 0 },
    });
  }

  // 7. Financial Periods
  const currentPeriod = await prisma.financialPeriod.upsert({
    where: { name: `FY${new Date().getUTCFullYear()}` },
    update: {},
    create: {
      name: `FY${new Date().getUTCFullYear()}`,
      startDate: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
      endDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31, 23, 59, 59)),
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
      balance: 0,
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
      balance: 0,
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
      balance: 0,
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
      outstandingBalance: 0,
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
      outstandingBalance: 0,
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
      update: {},
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
      update: {},
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
      update: {},
      create: {
        productId: product.id,
        warehouseId: whWCL.id,
        quantityOnHand: p.wclQty,
        quantityReserved: 0.0,
        averageCost: p.standardCost,
      },
    });
  }


  for (const [code, name, category] of [
    ['2020', 'Goods Received Not Invoiced', 'LIABILITY'], ['1300', 'Recoverable Input Tax', 'ASSET'], ['2030', 'Sales Tax Payable', 'LIABILITY'],
  ]) await prisma.account.upsert({ where: { code }, update: {}, create: { code, name, category, balance: 0 } });
  for (const model of [prisma.account, prisma.financialPeriod, prisma.vendor, prisma.customer, prisma.product] as any[]) {
    await model.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });
  }
  if (!await prisma.journalEntry.findUnique({ where: { entryNumber: 'OPENING-BALANCES' } })) {
    await prisma.$transaction(async tx => {
      const stocks = await tx.stockLevel.findMany();
      const inventory = Math.round(stocks.reduce((v, st) => v + st.quantityOnHand * st.averageCost, 0) * 100) / 100;
      for (const st of stocks) await tx.stockMovement.create({ data: {
        movementNumber: `OPENING-${st.id}`, productId: st.productId, warehouseId: st.warehouseId, type: 'ADJUSTMENT',
        quantity: st.quantityOnHand, unitCost: st.averageCost, totalCost: st.quantityOnHand * st.averageCost, notes: 'Documented demo opening inventory', referenceType: 'OPENING',
      } });
      const cash = await tx.account.findUniqueOrThrow({ where: { code: '1010' } });
      const stock = await tx.account.findUniqueOrThrow({ where: { code: '1400' } });
      const equity = await tx.account.findUniqueOrThrow({ where: { code: '3010' } });
      await tx.journalEntry.create({ data: { entryNumber: 'OPENING-BALANCES', periodId: currentPeriod.id, referenceType: 'OPENING', description: 'Demo opening capital and inventory', createdById: adminUser.id,
        lines: { create: [{ accountId: cash.id, debit: 150000, credit: 0 }, { accountId: stock.id, debit: inventory, credit: 0 }, { accountId: equity.id, debit: 0, credit: inventory + 150000 }] },
      } });
      await tx.account.update({ where: { id: cash.id }, data: { balance: 150000 } });
      await tx.account.update({ where: { id: stock.id }, data: { balance: inventory } });
      await tx.account.update({ where: { id: equity.id }, data: { balance: inventory + 150000 } });
    });
  }
  console.log('EnterpriseX initialized; existing business transactions preserved.');

}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function login(page: any, role = 'admin') {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`${role}@enterprisex.com`);
  await page.locator('input[type=password]').fill('EnterpriseX2026!');
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60000 });
}
test('all main routes load, search opens, theme changes and mobile stays within viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await login(page);
  for (const route of ['/dashboard','/procurement','/logistics','/inventory','/sales','/billing','/finance','/reports','/workflows','/audit','/admin','/vendors','/customers']) {
    await page.goto(route); await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Unable to load report');
  }
  await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search transactions, accounts, SKUs, or modules...')).toBeVisible(); await page.keyboard.press('Escape');
  const before = await page.locator('html').getAttribute('class'); await page.getByRole('button',{name:'Toggle Theme'}).click(); expect(await page.locator('html').getAttribute('class')).not.toBe(before);
  await page.setViewportSize({width:390,height:844}); await page.goto('/inventory');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('vendor CRUD persists after refresh and supports search', async ({ page }) => {
  await login(page); await page.goto('/vendors');
  const code=`E2E-${Date.now()}`; const name=`Browser Vendor ${Date.now()}`;
  await page.getByText('Add vendor',{exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.locator('[name=code]').fill(code);await dialog.locator('[name=name]').fill(name);await dialog.locator('[name=email]').fill('browser@example.test');
  await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0);
  await page.evaluate(()=>localStorage.setItem('enterprisex_token','expired-access-token'));
  await page.reload();await expect(page.getByText(name,{exact:true})).toBeVisible();
  await page.getByLabel('Search vendors').fill(code);await page.getByRole('button',{name:`Edit ${name}`,exact:true}).click();
  await page.getByRole('dialog').locator('[name=name]').fill(`${name} Updated`);await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText(`${name} Updated`,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:`Delete ${name} Updated`,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByText(`${name} Updated`,{exact:true})).toHaveCount(0);
});

test('browser executes P2P and O2C, exports CSV and downloads genuine PDFs', async ({ page }) => {
  await login(page);await page.goto('/workflows');
  await page.getByRole('button',{name:'Run P2P Pipeline'}).click();await expect(page.getByText('Status: COMPLETED',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Run O2C Pipeline'}).click();await expect(page.getByText('Status: COMPLETED',{exact:true})).toHaveCount(2);
  await page.goto('/reports');const csvPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const csv=await csvPromise;expect((await readFile((await csv.path())!,'utf8'))).toContain('EntryNumber,Date,Period');
  await page.goto('/billing');const pdfPromise=page.waitForEvent('download');await page.getByTitle('Print / View Invoice PDF').first().click();const pdf=await pdfPromise;expect((await readFile((await pdf.path())!)).subarray(0,4).toString()).toBe('%PDF');
  await page.reload();await expect(page.getByText('PAID',{exact:true}).first()).toBeVisible();
});

test('warehouse role sees scoped inventory and cannot open finance', async ({ page }) => {
  await login(page,'warehouse');
  await expect(page.getByRole('link',{name:'Finance & General Ledger',exact:true})).toHaveCount(0);
  await page.goto('/inventory');await expect(page.getByRole('heading',{name:'SKUs, Stock Ledger & Warehouses'})).toBeVisible();
  await page.goto('/finance');await expect(page.getByText('You do not have permission to view this module.')).toBeVisible();
});

test('individual purchase and sales forms complete receiving, invoicing and settlement', async ({ page }) => {
  await login(page);
  const submit = async (path: string, action: () => Promise<unknown>, method = 'POST') => {
    const result = page.waitForResponse(r => new URL(r.url()).pathname === `/api${path}` && r.request().method() === method);
    await action(); const response = await result;
    expect(response.status()).toBeLessThan(300);
    return (await response.json()).data;
  };
  await page.goto('/procurement');await page.getByRole('button',{name:'Create Purchase Order',exact:true}).click();
  await page.locator('form select').nth(0).selectOption({index:1});await page.locator('form select').nth(1).selectOption({index:1});await page.locator('form input[type=number]').fill('1');
  const po=await submit('/procurement/purchase-orders',()=>page.getByRole('button',{name:'Submit Requisition',exact:true}).click());
  await page.locator('tr').filter({hasText:po.poNumber}).getByTitle('View Details & Authorize').click();
  await submit(`/procurement/purchase-orders/${po.id}/approve`,()=>page.getByRole('button',{name:'Authorize & Approve',exact:true}).click(),'PATCH');
  await page.goto('/logistics');await page.getByRole('button',{name:'Receive Inbound Shipment',exact:true}).click();await page.locator('form select').nth(0).selectOption(po.id);await page.locator('form select').nth(1).selectOption({index:0});
  await submit('/logistics/goods-receipts',()=>page.getByRole('button',{name:'Post Goods Receipt',exact:true}).click());
  const invoiceAndPay = async (sourceId: string) => {
    await page.goto('/billing');await page.getByRole('button',{name:'Create Invoice',exact:true}).click();await page.getByLabel('Invoice source').selectOption(sourceId);
    const created = page.waitForResponse(r => /\/api\/billing\/invoices\/(ap|ar)$/.test(new URL(r.url()).pathname) && r.request().method()==='POST');
    await page.getByRole('dialog').getByRole('button',{name:'Create',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const invoice=(await response.json()).data;
    const row=page.locator('tr').filter({hasText:invoice.invoiceNumber});await row.getByRole('button',{name:'Settle',exact:true}).click();
    await submit('/billing/payments',()=>page.locator('form button[type=submit]').click());
    await expect(row).toContainText('PAID');return invoice;
  };
  await invoiceAndPay(po.id);
  await page.goto('/sales');await page.getByRole('button',{name:'New Sales Order',exact:true}).click();await page.locator('form select').nth(0).selectOption({index:1});await page.locator('form select').nth(1).selectOption({index:1});
  const so=await submit('/sales/sales-orders',()=>page.getByRole('button',{name:'Confirm Sales Order',exact:true}).click());
  const row=page.locator('tr').filter({hasText:so.soNumber});await submit(`/sales/sales-orders/${so.id}/reserve`,()=>row.getByRole('button',{name:'Reserve Stock',exact:true}).click());
  await submit(`/sales/sales-orders/${so.id}/fulfill`,()=>row.getByRole('button',{name:'Fulfill & Ship',exact:true}).click());
  await invoiceAndPay(so.id);
});

test('stock adjustment, manual journal, report tabs and notifications operate through their forms', async ({ page }) => {
  await login(page);await page.goto('/inventory');
  for (const delta of ['1','-1']) {
    await page.getByRole('button',{name:'Physical Stock Adjustment',exact:true}).click();
    await page.locator('form select').nth(0).selectOption({index:1});await page.locator('form select').nth(1).selectOption({index:1});
    await page.locator('form input[type=number]').fill(delta);await page.locator('form input[type=text]').fill('Verified browser stock recount');
    const result=page.waitForResponse(r=>r.url().includes('/api/inventory/adjust')&&r.request().method()==='POST');await page.getByRole('button',{name:'Post Adjustment',exact:true}).click();expect((await result).status()).toBe(200);await expect(page.locator('form')).toHaveCount(0);
  }
  await page.goto('/finance');await page.getByRole('button',{name:'Post Manual Journal Entry',exact:true}).click();
  await page.getByPlaceholder('e.g. Accrued supplier freight adjustment').fill('Verified browser operating expense');
  const selects=page.locator('form select');
  const debit=await selects.nth(1).locator('option').filter({hasText:'6010 -'}).getAttribute('value');const credit=await selects.nth(2).locator('option').filter({hasText:'1010 -'}).getAttribute('value');
  await selects.nth(1).selectOption(debit!);await selects.nth(2).selectOption(credit!);await page.getByPlaceholder('Debit ($)').nth(0).fill('1');await page.getByPlaceholder('Credit ($)').nth(1).fill('1');
  const journal=page.waitForResponse(r=>r.url().includes('/api/finance/journals')&&r.request().method()==='POST');await page.getByRole('button',{name:'Post Journal Entry',exact:true}).click();expect((await journal).status()).toBe(201);
  await page.goto('/reports');await page.getByRole('button',{name:'Balance Sheet',exact:true}).click();await expect(page.locator('main')).not.toContainText('NaN');await page.getByRole('button',{name:'Income Statement (P&L)',exact:true}).click();await expect(page.locator('main')).not.toContainText('NaN');
  await page.getByRole('button',{name:'Notifications',exact:true}).click();await expect(page.getByText('Notification Center',{exact:true})).toBeVisible();
});

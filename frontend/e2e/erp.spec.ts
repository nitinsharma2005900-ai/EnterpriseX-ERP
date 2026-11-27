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

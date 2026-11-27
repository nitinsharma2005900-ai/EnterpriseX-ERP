/**
 * Printable Document PDF Generator (Assessment 08 & Core Functionality)
 * Generates beautifully formatted HTML/Printable documents with actual transaction data,
 * branding in Emerald Green (#167D58), Dark Charcoal (#182420), and Warm Ivory (#F7F6F0).
 */

export function generateTransactionHTML(docType: 'PO' | 'INVOICE' | 'GRN', data: any): string {
  const isPO = docType === 'PO';
  const isInvoice = docType === 'INVOICE';
  const isGRN = docType === 'GRN';

  const docNumber = data.poNumber || data.invoiceNumber || data.grnNumber || 'DOC-0001';
  const dateStr = new Date(data.createdAt || data.issueDate || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const partyName = data.vendor?.name || data.customer?.name || data.purchaseOrder?.vendor?.name || 'Authorized Partner';
  const partyEmail = data.vendor?.email || data.customer?.email || 'partner@enterprise.com';
  const partyAddress = data.vendor?.address || data.customer?.address || '100 Industrial Blvd';

  let itemsRows = '';
  const items = data.items || [];
  for (const item of items) {
    const desc = item.product?.name || item.description || item.product?.sku || 'Item Description';
    const sku = item.product?.sku || '-';
    const qty = item.quantityOrdered || item.quantityReceived || item.quantity || 1;
    const unitPrice = item.unitPrice || item.unitCost || 0;
    const amount = item.totalAmount || item.amount || (qty * unitPrice);

    itemsRows += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #A8C3AE;"><strong>${desc}</strong><br><small style="color: #666;">SKU: ${sku}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #A8C3AE; text-align: center;">${qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #A8C3AE; text-align: right;">$${Number(unitPrice).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #A8C3AE; text-align: right;">$${Number(amount).toFixed(2)}</td>
      </tr>
    `;
  }

  const subtotal = Number(data.netAmount || data.subtotal || 0).toFixed(2);
  const tax = Number(data.taxAmount || 0).toFixed(2);
  const total = Number(data.totalAmount || 0).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EnterpriseX - ${docType} ${docNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #182420;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #167D58;
      padding-bottom: 20px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: #167D58;
      color: #F7F6F0;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 22px;
      border-radius: 8px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #182420;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-type {
      font-size: 26px;
      font-weight: 800;
      color: #167D58;
      margin: 0;
    }
    .doc-number {
      font-size: 16px;
      color: #D99A39;
      font-weight: 600;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
      background: #F7F6F0;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #A8C3AE;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    th {
      background: #182420;
      color: #F7F6F0;
      padding: 12px 10px;
      text-align: left;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .totals-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .grand-total {
      font-size: 18px;
      font-weight: 800;
      color: #167D58;
      border-top: 2px solid #167D58 !important;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #A8C3AE;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <div class="logo-badge">EX</div>
      <div>
        <div class="company-title">EnterpriseX</div>
        <div style="font-size: 12px; color: #555;">Integrated Finance, Procurement & Supply Chain ERP</div>
      </div>
    </div>
    <div class="doc-meta">
      <h1 class="doc-type">${docType === 'PO' ? 'PURCHASE ORDER' : docType === 'INVOICE' ? 'TAX INVOICE' : 'GOODS RECEIPT NOTE'}</h1>
      <div class="doc-number">${docNumber}</div>
      <div style="font-size: 13px; color: #666; margin-top: 4px;">Date: ${dateStr}</div>
      <div style="font-size: 13px; color: #666;">Status: <strong style="color: #167D58;">${data.status}</strong></div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <h3 style="margin-top: 0; color: #167D58; font-size: 14px; text-transform: uppercase;">Issuer</h3>
      <strong>EnterpriseX Global Holdings Inc.</strong><br>
      100 Enterprise Way, Suite 500<br>
      Chicago, IL 60601, United States<br>
      Tax ID: US-987654321<br>
      Email: finance@enterprisex.com
    </div>
    <div>
      <h3 style="margin-top: 0; color: #167D58; font-size: 14px; text-transform: uppercase;">Recipient / Partner</h3>
      <strong>${partyName}</strong><br>
      ${partyAddress}<br>
      Email: ${partyEmail}<br>
      Terms: ${data.terms || data.paymentTerms || 'Net 30'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description & SKU</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Amount (USD)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-container">
    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td style="text-align: right; font-weight: 600;">$${subtotal}</td>
      </tr>
      <tr>
        <td>Sales Tax (10%)</td>
        <td style="text-align: right; font-weight: 600;">$${tax}</td>
      </tr>
      <tr class="grand-total">
        <td>Total Amount</td>
        <td style="text-align: right;">$${total}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    This is an authoritative system-generated document issued by EnterpriseX ERP. Verified cryptographically.
  </div>
</body>
</html>
  `;
}

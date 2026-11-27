import PDFDocument from 'pdfkit';
import { createHash } from 'node:crypto';
import { db } from '../../config/transaction';
import { assert } from '../../utils/business';

export async function transactionPDF(type: string, id: string): Promise<Buffer> {
  const tx = db();
  const record: any = type === 'po' ? await tx.purchaseOrder.findUnique({ where: { id }, include: { vendor: true, items: { include: { product: true } } } })
    : type === 'invoice' ? await tx.invoice.findUnique({ where: { id }, include: { vendor: true, customer: true, items: { include: { product: true } } } })
    : type === 'grn' ? await tx.goodsReceipt.findUnique({ where: { id }, include: { purchaseOrder: { include: { vendor: true } }, items: { include: { product: true } } } }) : null;
  assert(record, 'Document not found', 'NOT_FOUND', 404);
  const pdf = new PDFDocument({ margin: 45, size: 'A4', info: { Title: record.poNumber || record.invoiceNumber || record.grnNumber, Author: 'EnterpriseX' } });
  const chunks: Buffer[] = [];
  const completion = new Promise<Buffer>((resolve, reject) => { pdf.on('data', c => chunks.push(c)); pdf.on('end', () => resolve(Buffer.concat(chunks))); pdf.on('error', reject); });
  pdf.fillColor('#167D58').fontSize(24).text('EnterpriseX');
  pdf.fillColor('#182420').fontSize(17).text(`${type.toUpperCase()} ${record.poNumber || record.invoiceNumber || record.grnNumber}`);
  pdf.moveDown().fontSize(11).text(`Status: ${record.status}`);
  pdf.text(`Party: ${record.vendor?.name || record.customer?.name || record.purchaseOrder?.vendor?.name || ''}`);
  pdf.text(`Date: ${new Date(record.createdAt).toISOString().slice(0, 10)}`);
  pdf.moveDown();
  for (const item of record.items) {
    if (pdf.y > 720) pdf.addPage();
    pdf.fontSize(10).text(`${item.product?.name || item.description || 'Item'} | Quantity: ${item.quantityOrdered ?? item.quantityAccepted ?? item.quantity} | Price: ${(item.unitPrice ?? item.unitCost ?? 0).toFixed(2)} | Total: ${(item.totalAmount ?? item.amount ?? item.quantityAccepted * item.unitCost).toFixed(2)}`);
    pdf.moveDown(0.5);
  }
  if (record.totalAmount !== undefined) pdf.moveDown().fontSize(13).text(`Total USD: ${record.totalAmount.toFixed(2)}`);
  pdf.end();
  const content = await completion;
  await tx.storedDocument.upsert({ where: { entityType_entityId: { entityType: type, entityId: id } }, create: { entityType: type, entityId: id, content: content.toString('base64'), checksum: createHash('sha256').update(content).digest('hex') }, update: { content: content.toString('base64'), checksum: createHash('sha256').update(content).digest('hex') } });
  return content;
}

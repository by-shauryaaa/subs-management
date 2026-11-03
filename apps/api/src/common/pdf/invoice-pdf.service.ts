import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface InvoicePdfData {
  number: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  company: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  };
  customer: {
    name: string;
    email: string;
    companyName?: string | null;
    billingAddress?: string | null;
    taxId?: string | null;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }>;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  status: string;
  currency: string;
}

@Injectable()
export class InvoicePdfService {
  async generate(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0F766E')
        .text(data.company.name || 'Brightloop', 50, 50);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text(data.company.address || '', 50, 75)
        .text(data.company.email ? `Email: ${data.company.email}` : '', 50, 90)
        .text(data.company.taxId ? `Tax ID: ${data.company.taxId}` : '', 50, 105);

      // Invoice metadata
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('INVOICE', 350, 50, { align: 'right' })
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#4B5563')
        .text(`Invoice #: ${data.number}`, 350, 75, { align: 'right' })
        .text(`Date: ${data.invoiceDate}`, 350, 90, { align: 'right' })
        .text(`Due Date: ${data.dueDate}`, 350, 105, { align: 'right' })
        .text(`Status: ${data.status}`, 350, 120, { align: 'right' });

      // Horizontal line
      doc
        .moveTo(50, 145)
        .lineTo(545, 145)
        .strokeColor('#E5E7EB')
        .stroke();

      // Bill To
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Bill To:', 50, 160)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(data.customer.name, 50, 178)
        .text(data.customer.companyName || '', 50, 193)
        .text(data.customer.billingAddress || '', 50, 208)
        .text(`Email: ${data.customer.email}`, 50, 223)
        .text(data.customer.taxId ? `Tax ID: ${data.customer.taxId}` : '', 50, 238);

      // Line items table header
      let y = 270;
      doc
        .rect(50, y, 495, 22)
        .fillColor('#F3F4F6')
        .fill();

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text('Description', 60, y + 6)
        .text('Qty', 320, y + 6, { width: 40, align: 'right' })
        .text('Unit Price', 370, y + 6, { width: 70, align: 'right' })
        .text('Total', 450, y + 6, { width: 85, align: 'right' });

      y += 26;
      doc.font('Helvetica').fontSize(9).fillColor('#1F2937');

      for (const line of data.lines) {
        doc.text(line.description, 60, y, { width: 250 });
        doc.text(line.quantity.toString(), 320, y, { width: 40, align: 'right' });
        doc.text(`${data.currency} ${line.unitPrice}`, 370, y, { width: 70, align: 'right' });
        doc.text(`${data.currency} ${line.amount}`, 450, y, { width: 85, align: 'right' });
        y += 20;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      // Summary
      y += 15;
      doc.moveTo(350, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();
      y += 10;

      const rightAlignTotals = (label: string, val: string, bold = false) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor('#374151')
          .text(label, 350, y, { width: 90, align: 'left' })
          .text(`${data.currency} ${val}`, 440, y, { width: 95, align: 'right' });
        y += 16;
      };

      rightAlignTotals('Subtotal', data.subtotal);
      if (parseFloat(data.discountTotal) > 0) {
        rightAlignTotals('Discounts', `-${data.discountTotal}`);
      }
      rightAlignTotals('Tax Total', data.taxTotal);
      rightAlignTotals('Total', data.total, true);
      rightAlignTotals('Amount Paid', data.amountPaid);
      rightAlignTotals('Amount Due', data.amountDue, true);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#9CA3AF')
        .text(
          'Thank you for your business. For any inquiries, please contact your account representative.',
          50,
          750,
          { align: 'center', width: 495 },
        );

      doc.end();
    });
  }
}

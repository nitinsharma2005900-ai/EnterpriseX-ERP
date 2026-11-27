import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export class VendorsService {
  static async getVendors() {
    return prisma.vendor.findMany({
      include: {
        _count: { select: { purchaseOrders: true, invoices: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');
    return vendor;
  }

  static async createVendor(data: {
    code: string;
    name: string;
    email: string;
    taxNumber?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    currency?: string;
    rating?: number;
  }) {
    const existing = await prisma.vendor.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError(`Vendor code ${data.code} already exists`, 409, 'VENDOR_EXISTS');

    return prisma.vendor.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email,
        taxNumber: data.taxNumber,
        phone: data.phone,
        address: data.address,
        paymentTerms: data.paymentTerms || 'NET30',
        currency: data.currency || 'USD',
        rating: data.rating || 4.5,
        status: 'ACTIVE',
      },
    });
  }

  static async updateVendor(id: string, data: any) {
    return prisma.vendor.update({
      where: { id },
      data,
    });
  }
}

import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export class CustomersService {
  static async getCustomers() {
    return prisma.customer.findMany({
      include: {
        _count: { select: { salesOrders: true, invoices: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    return customer;
  }

  static async createCustomer(data: {
    code: string;
    name: string;
    email: string;
    taxNumber?: string;
    phone?: string;
    address?: string;
    creditLimit?: number;
    paymentTerms?: string;
  }) {
    const existing = await prisma.customer.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError(`Customer code ${data.code} already exists`, 409, 'CUSTOMER_EXISTS');

    return prisma.customer.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email,
        taxNumber: data.taxNumber,
        phone: data.phone,
        address: data.address,
        creditLimit: data.creditLimit || 50000.0,
        paymentTerms: data.paymentTerms || 'NET30',
        status: 'ACTIVE',
      },
    });
  }
}

import './env';
import { PrismaClient } from '@prisma/client';
import { modelScope, scopeContext } from './scope';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

prisma.$use(async (params, next) => {
  const scope = modelScope(params.model);
  const user = scopeContext.getStore();
  params.args ||= {};
  const pagination = user?.pagination;
  if (params.action === 'findMany' && pagination && pagination.model === params.model) {
    params.args.skip = (pagination.page - 1) * pagination.pageSize;
    params.args.take = pagination.pageSize;
  }
  if (scope && ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
    params.args.where = { ...params.args.where, AND: [params.args.where?.AND || {}, scope] };
  }
  if (user && ['Account','FinancialPeriod','Vendor','Customer','Product','SystemIncident','IntegrationJob'].includes(params.model || '') && ['create','upsert'].includes(params.action)) {
    const target = params.action === 'upsert' ? 'create' : 'data';
    params.args[target] = { ...params.args[target], organizationId: user.organizationId };
  }
  return next(params);
});

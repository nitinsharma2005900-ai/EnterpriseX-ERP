export const canAccess = (role: string | undefined, path: string) => {
  if (!role) return false;
  if (role === 'ERP_ADMINISTRATOR') return true;
  if (path === '/admin') return false;
  if (['/finance','/reports','/audit'].includes(path)) return ['FINANCE_OFFICER','DEPARTMENT_MANAGER'].includes(role) && (path !== '/audit' || role === 'FINANCE_OFFICER');
  if (path === '/workflows') return role === 'FINANCE_OFFICER';
  if (path === '/procurement' || path === '/vendors') return ['PROCUREMENT_OFFICER','DEPARTMENT_MANAGER','FINANCE_OFFICER'].includes(role);
  if (path === '/logistics') return ['WAREHOUSE_OPERATOR','PROCUREMENT_OFFICER','FINANCE_OFFICER'].includes(role);
  if (path === '/sales' || path === '/customers') return ['SALES_USER','WAREHOUSE_OPERATOR','FINANCE_OFFICER'].includes(role);
  if (path === '/billing') return ['FINANCE_OFFICER','PROCUREMENT_OFFICER','SALES_USER'].includes(role);
  return true;
};

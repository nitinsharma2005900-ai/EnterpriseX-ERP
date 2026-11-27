import { z } from 'zod';
export function buildApiSpec(mounts: Array<[string, any]>) {
  const paths: Record<string, any> = {};
  for (const [prefix, router] of mounts) for (const layer of router.stack) {
    if (!layer.route) continue;
    const original = `${prefix}${layer.route.path === '/' ? '' : layer.route.path}`;
    const parameters = [...original.matchAll(/:(\w+)/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }));
    const path = original.replace(/:(\w+)/g, '{$1}');
    paths[path] ||= {};
    for (const method of Object.keys(layer.route.methods)) {
      const validator = layer.route.stack.find((l: any) => l.handle.schema)?.handle.schema;
      paths[path][method] = {
        summary: `${method.toUpperCase()} ${original}`, operationId: `${method}_${original.replace(/\W/g,'_')}`,
        security: path.includes('/auth/login') || path.includes('/auth/refresh') || path.includes('/demo-accounts') || path.includes('/health') || path.includes('/readiness') ? [] : [{ bearerAuth: [] }],
        parameters: [...parameters, ...(['get'].includes(method) ? [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 500 } }] : [])],
        ...(validator ? { requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(validator, { unrepresentable: 'any' }) } } } } : {}),
        responses: { '200': { description: 'Successful operation; JSON envelope with success and data' }, '201': { description: 'Resource created' }, '400': { description: 'Validation or business state error' }, '401': { description: 'Missing, expired or revoked session' }, '403': { description: 'Role, resource scope or approval limit denied' }, '404': { description: 'Resource not found in authorized scope' }, '409': { description: 'Duplicate, conflicting idempotency key or record in use' }, '503': { description: 'Required processing service unavailable' } },
      };
    }
  }
  paths['/api/documents/{type}/{id}/pdf'] = { get: { summary: 'Authenticated binary PDF download', parameters: [{name:'type',in:'path',required:true,schema:{type:'string',enum:['po','grn','invoice']}},{name:'id',in:'path',required:true,schema:{type:'string'}}], security:[{bearerAuth:[]}],responses:{'200':{description:'PDF attachment',content:{'application/pdf':{schema:{type:'string',format:'binary'}}}}} } };
  return { openapi: '3.1.0', info: { title: 'EnterpriseX ERP API', version: '1.1.0', description: 'POST creates orders. PO: PENDING_APPROVAL -> APPROVED -> PARTIALLY_RECEIVED -> COMPLETED; rejection only while pending. SO: CONFIRMED -> RESERVED -> FULFILLED -> INVOICED. Invoice: ISSUED -> PARTIALLY_PAID -> PAID. Atomic workflows include inventory and accounting; failures roll back all business mutations. All monetary amounts are USD.' }, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } }, paths };
}

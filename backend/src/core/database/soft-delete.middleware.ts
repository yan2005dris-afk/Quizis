// Middleware de soft delete para Prisma
// Aplica a todos los modelos que tienen campo deletedAt
// Convierte delete/deleteMany en update con deletedAt y filtra eliminados en consultas

// Modelos que implementan soft delete (tienen campo deletedAt)
const SOFT_DELETE_MODELS = [
  'lecturas',
  'lecturaAnomalia',
  'medidores',
  'clientes',
  'contratos',
  'usuarios',
  'roles',
  'permisos',
  'menus',
  'comunidades',
  'sectores',
  'facturas',
  'prefacturas',
  'pagos',
  'categoriasTarifa',
  'rubros',
  'convenios',
  'cuotasConvenio',
  'detallesPago',
  'saldoFavorCliente',
  'parametrosTasaInteres',
  'usuarioPermisos',
  'rolPermisos',
  'menuPermisos',
] as const;

// Métodos que interceptamos
const methods = [
  'delete',
  'deleteMany',
  'findMany',
  'findFirst',
  'findUnique',
] as const;

// Lógica base de soft delete
const createSoftDeleteHandlers = () => {
  const handlers: Record<string, unknown> = {};

  for (const model of SOFT_DELETE_MODELS) {
    for (const method of methods) {
      if (method === 'delete' || method === 'deleteMany') {
        // Convertir delete en update con deletedAt

        handlers[`${model}.${method}`] = async function ({ args }: any) {
          const data = { deletedAt: new Date() };
          if (method === 'delete') {
            return this.update(args, data);
          }
          return this.updateMany(args, data);
        };
      } else {
        // Agregar filtro deletedAt: null en consultas

        handlers[`${model}.${method}`] = async function ({ args, query }: any) {
          if (args?.where && args.where.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        };
      }
    }
  }

  return handlers;
};

// Genera la extensión de Prisma para soft delete
export function createSoftDeleteExtension(): unknown {
  const handlers = createSoftDeleteHandlers();

  return {
    query: {
      $allModels: function ({ model, method, args, query }: any) {
        const key = `${model}.${method}`;
        if (handlers[key]) {
          return (handlers[key] as any)({ model, method, args, query });
        }
        return query(args);
      },
    },
  };
}

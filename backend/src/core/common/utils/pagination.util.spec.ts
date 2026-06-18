import { paginate } from './pagination.util';

describe('paginate', () => {
  const buildModel = (total: number, items: any[]) => ({
    count: jest.fn().mockResolvedValue(total),
    findMany: jest.fn().mockResolvedValue(items),
  });

  it('primera página con 10 items por página', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const model = buildModel(25, items);

    const result = await paginate(model, {}, { page: 1, limit: 5 });

    expect(result.data).toHaveLength(5);
    expect(result.meta.paginaActual).toBe(1);
    expect(result.meta.total).toBe(25);
    expect(result.meta.ultimaPagina).toBe(5);
    expect(result.meta.anterior).toBeNull();
    expect(result.meta.siguiente).toBe(2);
  });

  it('página intermedia → anterior y siguiente correctos', async () => {
    const model = buildModel(50, []);

    const result = await paginate(model, {}, { page: 3, limit: 10 });

    // 50/10 = 5 páginas totales, página 3 está en el medio
    expect(result.meta.anterior).toBe(2);
    expect(result.meta.siguiente).toBe(4);
  });

  it('última página → siguiente null', async () => {
    const model = buildModel(20, []);

    const result = await paginate(model, {}, { page: 2, limit: 10 });

    expect(result.meta.siguiente).toBeNull();
    expect(result.meta.anterior).toBe(1);
  });

  it('page inválida (0 o negativa) → usa página 1', async () => {
    const model = buildModel(10, []);

    const result = await paginate(model, {}, { page: 0, limit: 5 });

    expect(result.meta.paginaActual).toBe(1);
  });

  it('limit inválido (0) → usa límite 10 por defecto', async () => {
    const model = buildModel(10, []);

    const result = await paginate(model, {}, { limit: 0 });

    expect(result.meta.porPagina).toBe(10);
  });

  it('sin opciones → page 1, limit 10 por defecto', async () => {
    const model = buildModel(5, [{ id: 1 }]);

    const result = await paginate(model);

    expect(result.meta.paginaActual).toBe(1);
    expect(result.meta.porPagina).toBe(10);
  });

  it('calcula skip correctamente (page-1 * limit)', async () => {
    const model = buildModel(50, []);

    await paginate(model, {}, { page: 3, limit: 10 });

    expect(model.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

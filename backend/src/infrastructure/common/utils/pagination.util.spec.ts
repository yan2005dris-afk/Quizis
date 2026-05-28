import { paginate } from './pagination.util';

describe('paginate', () => {
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    };
  });

  it('should return anterior: null and siguiente: 2 on first page with multiple pages', async () => {
    mockModel.count.mockResolvedValue(25);

    const result = await paginate(mockModel, {}, { page: 1, limit: 10 });

    expect(result.meta.paginaActual).toBe(1);
    expect(result.meta.anterior).toBeNull();
    expect(result.meta.siguiente).toBe(2);
    expect(result.meta.ultimaPagina).toBe(3);
    expect(result.meta.total).toBe(25);
  });

  it('should return siguiente: null and anterior: 2 on last page', async () => {
    mockModel.count.mockResolvedValue(25);

    const result = await paginate(mockModel, {}, { page: 3, limit: 10 });

    expect(result.meta.paginaActual).toBe(3);
    expect(result.meta.anterior).toBe(2);
    expect(result.meta.siguiente).toBeNull();
    expect(result.meta.ultimaPagina).toBe(3);
  });

  it('should return anterior: null and siguiente: null when all data fits in one page', async () => {
    mockModel.count.mockResolvedValue(5);

    const result = await paginate(mockModel, {}, { page: 1, limit: 10 });

    expect(result.meta.paginaActual).toBe(1);
    expect(result.meta.anterior).toBeNull();
    expect(result.meta.siguiente).toBeNull();
    expect(result.meta.ultimaPagina).toBe(1);
  });
});

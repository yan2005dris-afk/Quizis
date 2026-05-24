import { Test, TestingModule } from '@nestjs/testing';
import { CreateSalaUseCase } from './create-sala.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('CreateSalaUseCase', () => {
  let useCase: CreateSalaUseCase;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSalaUseCase,
        {
          provide: PrismaService,
          useValue: {
            salas: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateSalaUseCase>(CreateSalaUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should create a sala with a unique PIN', async () => {
    // Arrange
    const dto = { nombre: 'Test Sala', bancoId: 1, limitePreguntas: 10 };
    const adminId = 1;

    // Simulate no collisions for the generated PIN
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue(null);

    const mockCreatedSala = {
      salaId: 1,
      adminId,
      ...dto,
      pin: 'UPSE-1234',
      estado: 'borrador',
      tokenCompartido: 'uuid-1234',
    };
    (prismaService.salas.create as jest.Mock).mockResolvedValue(mockCreatedSala);

    // Act
    const result = await useCase.execute(adminId, dto);

    // Assert
    expect(result).toEqual(mockCreatedSala);
    expect(prismaService.salas.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaService.salas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId,
          nombre: dto.nombre,
          bancoId: dto.bancoId,
          pin: expect.stringMatching(/^UPSE-\d{4}$/),
        }),
      }),
    );
  });

  it('should retry PIN generation if there is a collision', async () => {
    const dto = { nombre: 'Test Sala', bancoId: 1 };
    const adminId = 1;

    // First call: Simulate collision. Second call: Simulate no collision.
    (prismaService.salas.findUnique as jest.Mock)
      .mockResolvedValueOnce({ salaId: 99 }) // Collision
      .mockResolvedValueOnce(null); // Free

    (prismaService.salas.create as jest.Mock).mockResolvedValue({
      salaId: 1,
      pin: 'UPSE-5678',
    });

    await useCase.execute(adminId, dto);

    // Should have checked DB twice due to collision
    expect(prismaService.salas.findUnique).toHaveBeenCalledTimes(2);
    expect(prismaService.salas.create).toHaveBeenCalledTimes(1);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UpdateEstadoSalaUseCase } from './update-estado-sala.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoSala } from '../dto/update-sala-estado.dto';

describe('UpdateEstadoSalaUseCase', () => {
  let useCase: UpdateEstadoSalaUseCase;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEstadoSalaUseCase,
        {
          provide: PrismaService,
          useValue: {
            salas: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    useCase = module.get<UpdateEstadoSalaUseCase>(UpdateEstadoSalaUseCase);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should successfully transition from borrador to esperando', async () => {
    const mockSala = { salaId: 1, estado: 'borrador' };
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue(mockSala);
    
    const mockUpdatedSala = { ...mockSala, estado: 'esperando' };
    (prismaService.salas.update as jest.Mock).mockResolvedValue(mockUpdatedSala);

    const result = await useCase.execute(1, EstadoSala.ESPERANDO);

    expect(result.estado).toBe('esperando');
    expect(prismaService.salas.update).toHaveBeenCalledWith({
      where: { salaId: 1 },
      data: { estado: 'esperando' },
    });
  });

  it('should throw NotFoundException if sala does not exist', async () => {
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(99, EstadoSala.ESPERANDO)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if transition is invalid (borrador to finalizado)', async () => {
    const mockSala = { salaId: 1, estado: 'borrador' };
    (prismaService.salas.findUnique as jest.Mock).mockResolvedValue(mockSala);

    await expect(useCase.execute(1, EstadoSala.FINALIZADO)).rejects.toThrow(
      BadRequestException,
    );
  });
});

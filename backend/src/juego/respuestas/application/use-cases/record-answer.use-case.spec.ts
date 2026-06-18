import { Test, TestingModule } from '@nestjs/testing';
import { RecordAnswerUseCase } from './record-answer.use-case';
import { PrismaService } from '../../../../core/database/prisma/prisma.service';

describe('RecordAnswerUseCase', () => {
  let useCase: RecordAnswerUseCase;
  let prisma: PrismaService;

  const mockPrisma = {
    respuestasRonda: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordAnswerUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    useCase = module.get<RecordAnswerUseCase>(RecordAnswerUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should update the existing record if one exists for the given rondaId and preguntaId', async () => {
    const data = {
      rondaId: 1,
      preguntaId: 10,
      opcionId: 3,
      esCorrecta: true,
      comodinUsado: null,
    };

    mockPrisma.respuestasRonda.findFirst.mockResolvedValue({
      respuestaId: 100,
      rondaId: 1,
      preguntaId: 10,
      opcionId: null,
      esCorrecta: false,
      comodinUsado: 'LLAMADA',
    });

    await useCase.execute(data);

    expect(prisma.respuestasRonda.findFirst).toHaveBeenCalledWith({
      where: {
        rondaId: 1,
        preguntaId: 10,
      },
    });
    expect(prisma.respuestasRonda.update).toHaveBeenCalledWith({
      where: { respuestaId: 100 },
      data: {
        opcionId: 3,
        esCorrecta: true,
        comodinUsado: 'LLAMADA', // preserves existing joker since data.comodinUsado is null
      },
    });
    expect(prisma.respuestasRonda.create).not.toHaveBeenCalled();
  });

  it('should create a new record if no existing record is found', async () => {
    const data = {
      rondaId: 1,
      preguntaId: 11,
      opcionId: 4,
      esCorrecta: false,
      comodinUsado: 'publico',
    };

    mockPrisma.respuestasRonda.findFirst.mockResolvedValue(null);

    await useCase.execute(data);

    expect(prisma.respuestasRonda.findFirst).toHaveBeenCalledWith({
      where: {
        rondaId: 1,
        preguntaId: 11,
      },
    });
    expect(prisma.respuestasRonda.create).toHaveBeenCalledWith({
      data: {
        rondaId: 1,
        preguntaId: 11,
        opcionId: 4,
        esCorrecta: false,
        comodinUsado: 'publico',
      },
    });
    expect(prisma.respuestasRonda.update).not.toHaveBeenCalled();
  });
});

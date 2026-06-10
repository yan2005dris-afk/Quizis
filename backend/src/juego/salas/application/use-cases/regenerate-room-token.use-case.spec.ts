import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegenerateRoomTokenUseCase } from './regenerate-room-token.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'new-uuid-1234-5678'),
}));

describe('RegenerateRoomTokenUseCase', () => {
  let useCase: RegenerateRoomTokenUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
    get: jest.fn().mockReturnValue('24h'),
  };

  const mockSala = { salaId: 1, tokenCompartido: 'old-uuid' };

  const mockSalaActualizada = {
    salaId: 1,
    tokenCompartido: 'new-uuid-1234-5678',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegenerateRoomTokenUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<RegenerateRoomTokenUseCase>(
      RegenerateRoomTokenUseCase,
    );
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockPrisma.salas.update.mockResolvedValue(mockSalaActualizada);
    mockConfigService.getOrThrow.mockReturnValue('test-room-secret');
    mockJwtService.signAsync.mockResolvedValue('new-jwt-invite-token');
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.salas.update).not.toHaveBeenCalled();
  });

  it('nuevo UUID persistido en DB', async () => {
    await useCase.execute(1);

    expect(mockPrisma.salas.update).toHaveBeenCalledWith({
      where: { salaId: 1 },
      data: { tokenCompartido: 'new-uuid-1234-5678' },
    });
  });

  it('JWT generado con nuevo tokenCompartido como sub', async () => {
    await useCase.execute(1);

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'new-uuid-1234-5678', salaId: 1 }),
      expect.any(Object),
    );
  });

  it('JWT expira en 24h', async () => {
    await useCase.execute(1);

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ expiresIn: '24h' }),
    );
  });

  it('retorna success, tokenCompartido nuevo y tokenInvitacion', async () => {
    const result = await useCase.execute(1);

    expect(result).toMatchObject({
      success: true,
      tokenCompartido: 'new-uuid-1234-5678',
      tokenInvitacion: 'new-jwt-invite-token',
    });
  });
});

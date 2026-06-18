import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GetInvitacionTokenUseCase } from './get-invitacion-token.use-case';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

describe('GetInvitacionTokenUseCase', () => {
  let useCase: GetInvitacionTokenUseCase;

  const mockPrisma = {
    salas: { findUnique: jest.fn() },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockSala = {
    salaId: 1,
    tokenCompartido: 'uuid-1234',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetInvitacionTokenUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<GetInvitacionTokenUseCase>(GetInvitacionTokenUseCase);
    jest.clearAllMocks();

    mockPrisma.salas.findUnique.mockResolvedValue(mockSala);
    mockConfigService.getOrThrow.mockReturnValue('test-room-secret');
    mockJwtService.signAsync.mockResolvedValue('jwt-invite-token');
  });

  it('sala no encontrada → NotFoundException', async () => {
    mockPrisma.salas.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('JWT generado con payload correcto (sub, salaId, tipo: room_invite)', async () => {
    await useCase.execute(1);

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'uuid-1234', salaId: 1, tipo: 'room_invite' },
      expect.objectContaining({ secret: 'test-room-secret' }),
    );
  });

  it('JWT expira en 24h', async () => {
    await useCase.execute(1);

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ expiresIn: '24h' }),
    );
  });

  it('JWT_ROOM_SECRET leído de ConfigService', async () => {
    await useCase.execute(1);

    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
      'JWT_ROOM_SECRET',
    );
  });

  it('retorna tokenInvitacion', async () => {
    const result = await useCase.execute(1);

    expect(result).toEqual({ tokenInvitacion: 'jwt-invite-token' });
  });
});

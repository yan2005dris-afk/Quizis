import { Module } from '@nestjs/common';
import { RoomStateCacheService } from './room-state-cache.service';
import { ParticipantsCacheService } from './participants-cache.service';

/**
 * Shared module that owns room-scoped cache services.
 *
 * Both `SalasModule` and `RondasModule` depend on these services, which
 * previously caused a circular module dependency (Salas ↔ Rondas).
 * Extracting them here breaks the cycle — both modules import this one
 * instead of each other.
 */
@Module({
  providers: [RoomStateCacheService, ParticipantsCacheService],
  exports: [RoomStateCacheService, ParticipantsCacheService],
})
export class RoomStateModule {}

import { Module } from '@nestjs/common';
import { RoomBroadcasterService } from './room-broadcaster.service';

/**
 * Leaf module that exposes RoomBroadcasterService as a shared singleton.
 *
 * Why this module exists:
 * RoomBroadcasterService is a pure leaf (only depends on a `socket.io` Server
 * reference set at runtime by JuegoGateway.afterInit + a Logger). It has no
 * inbound module dependencies. By lifting it into its own module, both
 * `ComodinesModule` and `WebsocketsInfraModule` can consume it without
 * forming a circular import between them.
 *
 * Singleton guarantee:
 * NestJS resolves a provider from a single module instance across the whole
 * container. Importing this module from N places yields the same instance,
 * so JuegoGateway.afterInit setting `server` on the broadcaster is observed
 * by every consumer (ComodinesRestController included).
 */
@Module({
  providers: [RoomBroadcasterService],
  exports: [RoomBroadcasterService],
})
export class RoomBroadcastModule {}

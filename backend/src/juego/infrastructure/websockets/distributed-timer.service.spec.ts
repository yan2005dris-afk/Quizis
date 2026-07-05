import { Test, TestingModule } from '@nestjs/testing';
import { DistributedTimerService } from './distributed-timer.service';
import { RedisService } from 'src/core/database/redis/redis.service';

const makeRedisMock = () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  eval: jest.fn(),
});

describe('DistributedTimerService — NX lock (Redis path)', () => {
  let service: DistributedTimerService;
  let redisMock: ReturnType<typeof makeRedisMock>;

  beforeEach(async () => {
    jest.useFakeTimers();
    redisMock = makeRedisMock();

    const redisServiceMock: Partial<RedisService> = {
      getClient: jest.fn().mockReturnValue(redisMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedTimerService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<DistributedTimerService>(DistributedTimerService);
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('starts interval and emits initial tick when NX lock is acquired', async () => {
    redisMock.set.mockResolvedValue('OK'); // NX acquired
    redisMock.expire.mockResolvedValue(1);

    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 5, onTick, onExpire);

    // Immediate tick on acquire
    expect(onTick).toHaveBeenCalledWith(5);
  });

  it('does NOT start interval when NX lock is missed', async () => {
    redisMock.set.mockResolvedValue(null); // NX miss

    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 5, onTick, onExpire);

    // No tick — lock not acquired
    expect(onTick).not.toHaveBeenCalled();

    // Advance time and confirm no ticks fire
    jest.advanceTimersByTime(3000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('calls onTick with decrementing remaining on each interval tick', async () => {
    redisMock.set.mockResolvedValue('OK');
    redisMock.expire.mockResolvedValue(1);

    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 3, onTick, onExpire);

    // Initial tick: 3
    expect(onTick).toHaveBeenNthCalledWith(1, 3);

    jest.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenNthCalledWith(2, 2);

    jest.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenNthCalledWith(3, 1);
  });

  it('calls onExpire and stops interval when remaining reaches 0', async () => {
    redisMock.set.mockResolvedValue('OK');
    redisMock.expire.mockResolvedValue(1);
    // detenerTimer uses Lua eval — simulate successful lock release
    redisMock.eval.mockResolvedValue(1);

    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 1, onTick, onExpire);

    jest.advanceTimersByTime(1000);

    // Flush multiple async microtask layers (setInterval callback → detenerTimer → client.get → client.del)
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('stops interval when EXPIRE renewal returns 0 (lock lost)', async () => {
    redisMock.set.mockResolvedValue('OK');
    // First renewal fails (returns 0 = key gone)
    redisMock.expire.mockResolvedValue(0);

    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 10, onTick, onExpire);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    // After lock lost, no further ticks
    jest.advanceTimersByTime(3000);
    // Only the initial tick (count=10) should have fired before the lock was lost
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(2);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('clears existing interval before starting a new one on the same token', async () => {
    redisMock.set.mockResolvedValue('OK');
    redisMock.expire.mockResolvedValue(1);
    redisMock.get.mockResolvedValue('__instance__');

    const onTick1 = jest.fn();
    const onTick2 = jest.fn();

    await service.iniciarTimer('room-1', 10, onTick1, jest.fn());
    // Call again — should clear previous interval
    await service.iniciarTimer('room-1', 5, onTick2, jest.fn());

    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // onTick1 should NOT continue firing after second iniciarTimer
    const tick1CallsAfterReset = onTick1.mock.calls.length;
    jest.advanceTimersByTime(1000);
    expect(onTick1.mock.calls.length).toBe(tick1CallsAfterReset); // no new calls
  });

  it('DEL lock on detenerTimer only if this instance owns it', async () => {
    const instanceId = (service as any).instanceId as string;
    redisMock.set.mockResolvedValue('OK');
    redisMock.expire.mockResolvedValue(1);
    redisMock.eval.mockResolvedValue(1); // Lua script returns 1 — lock released

    await service.iniciarTimer('room-1', 10, jest.fn(), jest.fn());
    await service.detenerTimer('room-1');

    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'timer:room-1:owner',
      instanceId,
    );
  });

  it('does NOT DEL lock on detenerTimer when another instance owns it', async () => {
    redisMock.set.mockResolvedValue('OK');
    redisMock.expire.mockResolvedValue(1);
    redisMock.eval.mockResolvedValue(0); // Lua script returns 0 — not the owner

    await service.iniciarTimer('room-1', 10, jest.fn(), jest.fn());
    await service.detenerTimer('room-1');

    expect(redisMock.eval).toHaveBeenCalled();
  });
});

describe('DistributedTimerService — in-memory fallback (Redis null)', () => {
  let service: DistributedTimerService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const redisServiceMock: Partial<RedisService> = {
      getClient: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedTimerService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<DistributedTimerService>(DistributedTimerService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs as sole owner when Redis is null and ticks correctly', async () => {
    const onTick = jest.fn();
    const onExpire = jest.fn();

    await service.iniciarTimer('room-1', 2, onTick, onExpire);

    expect(onTick).toHaveBeenCalledWith(2);

    jest.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('detenerTimer clears interval without Redis call', async () => {
    const onTick = jest.fn();

    await service.iniciarTimer('room-1', 10, onTick, jest.fn());
    await service.detenerTimer('room-1');

    const callsBeforeStop = onTick.mock.calls.length;
    jest.advanceTimersByTime(3000);
    expect(onTick.mock.calls.length).toBe(callsBeforeStop);
  });
});

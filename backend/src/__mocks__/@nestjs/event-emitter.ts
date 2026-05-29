// Manual mock for @nestjs/event-emitter
// Used because the package resolves via pnpm workspace but Jest can't find it
export const OnEvent = () => () => {};
export const EventEmitter2 = jest.fn();
export const EventEmitterModule = { forRoot: jest.fn() };

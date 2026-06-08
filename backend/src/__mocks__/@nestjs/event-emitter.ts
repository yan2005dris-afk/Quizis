export class EventEmitter2 {
  emit = jest.fn();
  on = jest.fn();
  once = jest.fn();
  off = jest.fn();
  removeListener = jest.fn();
  removeAllListeners = jest.fn();
}

export const EventEmitterModule = {
  forRoot: jest.fn().mockReturnValue({
    module: class EventEmitterModuleMock {},
    providers: [{ provide: EventEmitter2, useClass: EventEmitter2 }],
    exports: [EventEmitter2],
    global: true,
  }),
};

export const OnEvent = () => () => {};

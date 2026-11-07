import { notifyLocalChange, subscribeLocalChangeGathered } from '../src/sync/changes';

describe('subscribeLocalChangeGathered', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('잇따른 신호를 1초 모아 한 번 부른다', () => {
    const fn = jest.fn();
    const off = subscribeLocalChangeGathered(fn);
    notifyLocalChange();
    jest.advanceTimersByTime(500);
    notifyLocalChange();
    jest.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    off();
  });

  it('끊으면 기다리던 것도 부르지 않는다', () => {
    const fn = jest.fn();
    const off = subscribeLocalChangeGathered(fn);
    notifyLocalChange();
    off();
    jest.advanceTimersByTime(2000);
    notifyLocalChange();
    jest.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });
});

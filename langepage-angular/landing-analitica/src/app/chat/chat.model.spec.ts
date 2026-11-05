import { canRateMessage } from './chat.model';

describe('canRateMessage', () => {
  it('allows answers and "not found" from the agent', () => {
    expect(canRateMessage({ role: 'ai', status: 'answer' })).toBeTrue();
    expect(canRateMessage({ role: 'ai', status: 'not_in_data' })).toBeTrue();
  });

  it('does not allow the hand-over to the team, refusals, questions, errors, the user or the system', () => {
    expect(canRateMessage({ role: 'ai', status: 'not_in_data', contacts: [{ name: 'a', area: 'b', channel: 'c' }] })).toBeFalse();
    expect(canRateMessage({ role: 'ai', status: 'out_of_scope' })).toBeFalse();
    expect(canRateMessage({ role: 'ai', status: 'need_more_info' })).toBeFalse();
    expect(canRateMessage({ role: 'ai', status: 'error' })).toBeFalse();
    expect(canRateMessage({ role: 'ai' })).toBeFalse();
    expect(canRateMessage({ role: 'user', status: 'answer' })).toBeFalse();
    expect(canRateMessage({ role: 'system', status: 'answer' })).toBeFalse();
  });
});

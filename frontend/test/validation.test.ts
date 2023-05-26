import { assertNoConfusables } from '../src/utils/validation';

describe('assertNoConfusables', () => {
  it('Pass in name with a confusable', () => {
    const x = () => assertNoConfusables('‌.eth');
    expect(x).toThrow('Name contains confusables');
  });

  it('Pass in name with a confusable and a custom error message', () => {
    const x = () => assertNoConfusables('‌.eth', 'Custom error');
    expect(x).toThrow('Custom error');
  });

  it('Pass in a valid name', () => {
    const x = () => assertNoConfusables('hi.eth', 'Custom error');
    expect(x).not.toThrow();
  });
});

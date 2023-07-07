import { assertValidEnsName } from '../src/utils/validation';

describe('assertNoConfusables', () => {
  it('Pass in name with a confusable', () => {
    const x = () => assertValidEnsName('‌.eth');
    expect(x).toThrow(
      'The given ENS name is invalid due to:  disallowed character {200C} in the ENS name. Check the ENS name in order to avoid a potential scam.'
    );
  });

  it('Pass in a valid name', () => {
    const x = () => assertValidEnsName('hi.eth');
    expect(x).not.toThrow();
  });
});

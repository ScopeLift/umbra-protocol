/**
 * @jest-environment jsdom
 */
import { humanizeTokenAmount, humanizeArithmeticResult, humanizeMinSendAmount } from '../src/utils/utils';
import { parseUnits, parseEther } from '@ethersproject/units';

const usdc = {
  decimals: 6,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 1,
  name: 'USDC',
  symbol: 'USDC',
};

const weth = {
  decimals: 18,
  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  chainId: 137,
  name: 'WETH',
  symbol: 'WETH',
};

const eth = {
  decimals: 18,
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  chainId: 1,
  name: 'ETH',
  symbol: 'ETH',
};

describe('Utilities', () => {
  describe('humanizeTokenAmount', () => {
    it('rounds USDC to 2 decimal places when > 1', () => {
      const amount = parseUnits('42.11', usdc.decimals);
      expect(humanizeTokenAmount(amount, usdc)).toEqual('42.11');
    });
    it('rounds USDC to 2 decimal places when < 1', () => {
      const amount = parseUnits('.419', usdc.decimals);
      expect(humanizeTokenAmount(amount, usdc)).toEqual('0.42');
    });
    it('does not round USDC when a whole number', () => {
      const amount = parseUnits('42', usdc.decimals);
      expect(humanizeTokenAmount(amount, usdc)).toEqual('42');
    });
    it('rounds WETH to 2 sig figs when < 1', () => {
      const amount = parseUnits('0.007581732', weth.decimals);
      expect(humanizeTokenAmount(amount, weth)).toEqual('0.0076');
    });
    it('rounds WETH to 2 decimal places when > 1', () => {
      const amount = parseUnits('923.1928371', weth.decimals);
      expect(humanizeTokenAmount(amount, weth)).toEqual('923.19');
    });
    it('does not round WETH when a whole number', () => {
      const amount = parseUnits('53', weth.decimals);
      expect(humanizeTokenAmount(amount, weth)).toEqual('53');
    });
    it('rounds ETH to 2 sig figs when < 1', () => {
      const amount = parseUnits('0.000151732', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('0.00015');
    });
    it('rounds ETH to 1 decimal place when > 1 and rounding up', () => {
      const amount = parseUnits('32.1988371', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('32.2');
    });
    it('does not round ETH when a whole number', () => {
      const amount = parseUnits('12', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('12');
    });
    it('eliminates unnecessary precision when zero for ETH', () => {
      const amount = parseUnits('0.0000', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('0.0');
    });
    it('does not show scientific notation for small numbers', () => {
      const amount = parseUnits('0.00000002', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('0.00000002');
    });
    it.skip('trims extra digits from really small numbers', () => {
      const amount = parseUnits('0.00000002345', 'ether');
      expect(humanizeTokenAmount(amount, eth)).toEqual('0.000000023');
    });
  });

  describe('humanizeArithmeticResult', () => {
    it('should handle very high fees', () => {
      //   50.0
      // - 11.2
      // ===========
      //   38.8
      const subtotal = '50.0';
      const fee = '11.2';
      const total = parseEther('38.8');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('38.8');
    });
    it('should handle even higher fees with more precision', () => {
      //   70.00
      // - 31.21
      // ===========
      //   58.79
      const subtotal = '70.00';
      const fee = '31.21';
      const total = parseEther('58.79');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('58.79');
    });
    it('should not take unnecessary decimals in the fee into account', () => {
      //   1.0
      // - 0.1000000
      // ===========
      //   0.9
      const subtotal = '1.0';
      const fee = '0.100000';
      const total = parseEther('0.9');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('0.9');
    });
    it('should sometimes add a non-significant figure', () => {
      //   0.9999999
      // - 0.0000099
      // ===========
      //   0.9999900
      const subtotal = '0.9999999';
      const fee = '0.0000099';
      const total = parseEther('0.99999');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('0.9999900');
    });
    it('should not always change the decimals of the final amount', () => {
      //   2.000000
      // - 0.000021
      // ===========
      //   1.999979
      const subtotal = '2.000000';
      const fee = '0.000021';
      const total = parseEther('1.999979');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('1.999979');
    });
    it('should handle a fee with a lot of precision and round it', () => {
      //   7.000000000000000000
      // - 0.001428371937102478
      // ===========
      //   6.998571628062897522
      const subtotal = '7.000000000000000000';
      const fee = humanizeTokenAmount(parseEther('0.001428371937102478'), eth);
      const total = parseEther('6.998571628062897522');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      // display up to two sig figs into the fee
      expect(humanizedTotal).toEqual('6.9986');
    });
    it('should handle a fee that is zero', () => {
      //   7
      // - 0.000000000000000000
      // ===========
      //   7
      const subtotal = '7';
      const fee = '0.00000000000';
      const total = parseEther('7');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('7');
    });
    it('should not display extra figures', () => {
      //   300.
      // -   7.95
      // ===========
      //   292.05
      const subtotal = '300';
      const realFee = parseUnits('7.949', usdc.decimals); // i.e. not rounded
      const fee = humanizeTokenAmount(realFee, usdc); // i.e what the user sees
      const total = parseUnits('292.051', usdc.decimals);
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], usdc);
      expect(humanizedTotal).toEqual('292.05');
    });
    it('should work for native token sends where the fee is added', () => {
      //     1.
      // +   0.05
      // ===========
      //     1.05
      const subtotal = '1';
      const fee = '0.05';
      const total = parseEther('1.05');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('1.05');
    });
    it('should work for big native token sends where the fee is added', () => {
      //   100002.
      // +      0.05
      // ==============
      //   100002.05
      const subtotal = '100002';
      const fee = '0.05';
      const total = parseEther('100002.05');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('100,002.05');
    });
    it('should work for native token sends where nothing is sent', () => {
      // this is not something the app allows users to do, but the UI has to handle it anyway
      //     0.
      // +   0.05
      // ===========
      //     0.05
      const subtotal = '0';
      const fee = '0.05';
      const total = parseEther('0.05');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('0.05');
    });
    it('should work for native token sends when the amount is less than the fee', () => {
      // this is not something the app allows users to do, but the UI has to handle it anyway
      //     0.01
      // +   0.05
      // ===========
      //     0.06
      const subtotal = '0.01';
      const fee = '0.05';
      const total = parseEther('0.06');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('0.06');
    });
    it('should work for native sends when the amount is much less than the fee', () => {
      // this is not something the app allows users to do, but the UI has to handle it anyway
      //     0.0001
      // +   0.05
      // ===========
      //     0.0501
      const subtotal = '0.0001';
      const fee = '0.05';
      const total = parseEther('0.0501');
      const humanizedTotal = humanizeArithmeticResult(total, [subtotal, fee], eth);
      expect(humanizedTotal).toEqual('0.0501');
    });
    it('should work even when there are more than 2 addition operands', () => {
      // there's no reason why this shouldn't scale to 3 or more operands
      //   423.4
      //     0.0001
      // +   0.05
      // ===========
      //     0.0501
      const operands = ['423.4', '0.0001', '0.05'];
      // assume some precision was left out of the human readible numbers displayed to the user
      const total = parseEther('423.4501000123');
      const humanizedTotal = humanizeArithmeticResult(total, operands, eth);
      expect(humanizedTotal).toEqual('423.4501');
    });
    it('should work even when there are more than 2 subtraction operands', () => {
      // there's no reason why this shouldn't scale to 3 or more operands
      //   423.4
      //     0.0001
      // -   0.05
      // ===========
      //     0.0501
      const operands = ['423.4', '0.0001', '0.05'];
      // assume some precision was left out of the human readible numbers displayed to the user
      const total = parseEther('423.3498911111111');
      const humanizedTotal = humanizeArithmeticResult(total, operands, eth);
      expect(humanizedTotal).toEqual('423.3499');
    });
  });
  describe('humanizeMinSendAmount', () => {
    const tests = [
      { input: 123, output: 120 },
      { input: 1235, output: 1200 },
      { input: 1295, output: 1300 },
      { input: 432498, output: 430000 },
      { input: 4.8956, output: 5 },
      { input: 4.1956, output: 4 },
      { input: 0.1956, output: 0.2 },
      { input: 0.0194, output: 0.019 },
    ];

    tests.forEach((test) => {
      it(`humanizes ${test.input} as ${test.output}`, () => {
        expect(humanizeMinSendAmount(test.input)).toEqual(test.output);
      });
    });
  });
});

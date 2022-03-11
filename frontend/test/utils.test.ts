import { humanizeTokenAmount, roundReceivableAmountAfterFees } from '../src/utils/utils';
import { parseUnits, parseEther } from '@ethersproject/units';

const usdc = {
  decimals: 6,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 1,
  name: 'USDC',
  symbol: 'USDC',
}

const weth = {
  decimals: 18,
  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  chainId: 137,
  name: 'WETH',
  symbol: 'WETH',
}

const eth = {
  decimals: 18,
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  chainId: 1,
  name: 'ETH',
  symbol: 'ETH',
}

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
  });
  describe('roundReceivableAmountAfterFees', () => {
    it('should handle very high fees', () => {
      //   50.0
      // - 11.2
      // ===========
      //   38.8
      const fee = humanizeTokenAmount(parseEther('11.2'), eth);
      const finalAmount = parseEther('38.8');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('38.8');
    });
    it('should handle this case too', () => {
      //   70.00
      // - 31.21
      // ===========
      //   58.79
      const fee = humanizeTokenAmount(parseEther('31.21'), eth);
      const finalAmount = parseEther('58.79');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('58.79');
    });
    it('should not take unnecessary decimals in the fee into account', () => {
      //   1.0
      // - 0.1000000
      // ===========
      //   0.9
      const fee = humanizeTokenAmount(parseEther('0.100000'), eth);
      const finalAmount = parseEther('0.9');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('0.9');
    });
    it('should sometimes add a non-significant figure', () => {
      //   0.9999999
      // - 0.0000099
      // ===========
      //   0.9999900
      const fee = humanizeTokenAmount(parseEther('0.0000099'), eth);
      const finalAmount = parseEther('0.99999');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('0.9999900');
    });
    it('should not always change the decimals of the final amount', () => {
      //   2.000000
      // - 0.000021
      // ===========
      //   1.999979
      const fee = humanizeTokenAmount(parseEther('0.000021'), eth);
      const finalAmount = parseEther('1.999979');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('1.999979');
    });
    it('should handle a fee with a lot of precision', () => {
      //   7.000000000000000000
      // - 0.001428371937102478
      // ===========
      //   6.998571628062897522
      const fee = humanizeTokenAmount(parseEther('0.001428371937102478'), eth);
      const finalAmount = parseEther('6.998571628062897522');
      // display up to two sig figs into the fee
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('6.9986');
    });
    it('should handle a fee that is zero', () => {
      //   7
      // - 0.000000000000000000
      // ===========
      //   7
      const fee = humanizeTokenAmount(parseEther('0.00000000000000000'), eth);
      const finalAmount = parseEther('7');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('7');
    });
    it('should not display extra figures', () => {
      //   300.
      // -   7.95
      // ===========
      //   292.05
      const realFee = parseUnits('7.949', usdc.decimals); // i.e. not rounded
      const fee = humanizeTokenAmount(realFee, usdc); // i.e what the user sees
      const finalAmount = parseUnits('292.051');
      expect(roundReceivableAmountAfterFees(finalAmount, fee, eth)).toEqual('292.05');
    });
  });
});

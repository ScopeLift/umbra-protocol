import { humanizeTokenAmount } from '../src/utils/utils';
import { parseUnits } from '@ethersproject/units';

describe('Utilities', () => {
  describe('humanizeTokenAmount', () => {
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
});

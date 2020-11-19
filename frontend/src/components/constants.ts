import { Token } from 'components/models';

export const tokenList: Token[] = [
  {
    chainId: 3,
    symbol: 'DAI',
    name: 'Dai',
    decimals: 18,
    address: '0x31F42841c2db5173425b5223809CF3A38FEde360',
    iconPath: '/tokens/dai.png',
  },
  {
    chainId: 3,
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    iconPath: '/tokens/eth.png',
  },
  {
    chainId: 1,
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    iconPath: '/tokens/eth.png',
  },
];

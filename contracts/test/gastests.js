const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const GasTester = contract.fromArtifact('GasTester');

const { toWei } = web3.utils;

function randomBytes(length) {
  let result = '';
  const characters = 'ABCDEFabcdef0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length * 2; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return `${result}`;
}

describe('Gas Tests', () => {
  const [user] = accounts;

  before(async () => {
    this.instance = await GasTester.new();
  });

  it('should test the bytes32 option', async () => {
    console.log('TESTING 7 bytes32 ARGUMENTS'); // eslint-disable-line no-console

    const bytes = [];
    for (let i = 0; i < 7; i += 1) {
      bytes.push(`0x${randomBytes(32)}`);
    }

    const tx = await this.instance.manyBytes(...bytes, {
      from: user,
      value: toWei('1', 'ether'),
      gasPrice: 1,
    });
    console.log('GAS USED --->', tx.receipt.gasUsed); // eslint-disable-line no-console
  });

  it('should test the option with one bytes16 param', async () => {
    console.log('TESTING 6 bytes32 + 1 bytes16 ARGUMENTS'); // eslint-disable-line no-console

    const bytes = [];
    for (let i = 0; i < 6; i += 1) {
      bytes.push(`0x${randomBytes(32)}`);
    }

    bytes.push(`0x${randomBytes(16)}`);

    const tx = await this.instance.halfByte(...bytes, {
      from: user,
      value: toWei('1', 'ether'),
      gasPrice: 1,
    });
    console.log('GAS USED --->', tx.receipt.gasUsed); // eslint-disable-line no-console
  });

  it('should test the big string option', async () => {
    console.log('TESTING BIG string ARGUMENT'); // eslint-disable-line no-console
    const strBytes = randomBytes(208);
    const tx = await this.instance.bigString(strBytes, {
      from: user,
      value: toWei('1', 'ether'),
      gasPrice: 1,
    });
    console.log('GAS USED --->', tx.receipt.gasUsed); // eslint-disable-line no-console
  });
});

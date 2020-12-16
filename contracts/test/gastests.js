import { ethers } from 'hardhat';
const { parseUnits } = ethers.utils;

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
  let user, instance;

  before(async () => {
    [user] = await ethers.getSigners();
    const GasTester = await ethers.getContractFactory('GasTester');
    instance = await GasTester.deploy().then((c) => c.deployed());
  });

  it('should test the bytes32 option', async () => {
    console.log('TESTING 7 bytes32 ARGUMENTS');

    const bytes = [];
    for (let i = 0; i < 7; i += 1) {
      bytes.push(`0x${randomBytes(32)}`);
    }

    const receipt = await instance
      .manyBytes(...bytes, {
        from: user.address,
        value: parseUnits('1', 'ether'),
        gasPrice: 1,
      })
      .then(({ hash }) => ethers.provider.waitForTransaction(hash));
    console.log('GAS USED --->', receipt.gasUsed);
  });

  it('should test the option with one bytes16 param', async () => {
    console.log('TESTING 6 bytes32 + 1 bytes16 ARGUMENTS');

    const bytes = [];
    for (let i = 0; i < 6; i += 1) {
      bytes.push(`0x${randomBytes(32)}`);
    }

    bytes.push(`0x${randomBytes(16)}`);

    const receipt = await instance
      .halfByte(...bytes, {
        from: user.address,
        value: parseUnits('1', 'ether'),
        gasPrice: 1,
      })
      .then(({ hash }) => ethers.provider.waitForTransaction(hash));
    console.log('GAS USED --->', receipt.gasUsed);
  });

  it('should test the big string option', async () => {
    console.log('TESTING BIG string ARGUMENT');
    const strBytes = randomBytes(208);
    const receipt = await instance
      .bigString(strBytes, {
        from: user.address,
        value: parseUnits('1', 'ether'),
        gasPrice: 1,
      })
      .then(({ hash }) => ethers.provider.waitForTransaction(hash));
    console.log('GAS USED --->', receipt.gasUsed);
  });
});

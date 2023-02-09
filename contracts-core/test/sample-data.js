/* eslint-disable */
0x04a8ca477cb9ec0f45dd9aac5775487f224c4e40b08a60199a7789ed2a158cbee7e0ceb9d9f6bcf76d8221268f130d2218064a605f1cb670b4741ed4713baa5595;
0x15feb82777f1fe95dc9f13368e2d376a87fbad0354672b2aa983590d492a46a4;
/* eslint-enable */

const rawData = {
  ephemeralPublicKey:
    '0x04a8ca477cb9ec0f45dd9aac5775487f224c4e40b08a60199a7789ed2a158cbee7e0ceb9d9f6bcf76d8221268f130d2218064a605f1cb670b4741ed4713baa5595',
  ciphertext: '0x15feb82777f1fe95dc9f13368e2d376a87fbad0354672b2aa983590d492a46a4',
};

const bytes = [];

// Remove the '04' from the ephemeral public key, which is always the same, then
// take the first 32 bytes, which represents the x-coordinate on the elliptical
// curve. The y-coordinate can be derived, and does not need to be included.
bytes[0] = `0x${rawData.ephemeralPublicKey.slice(4, 4 + 64)}`;

// The ciphertext is already exactly 32 bytes, a 16 byte payload extension and
// a 16 byte random number used for deriving the stealth address.
bytes[1] = rawData.ciphertext;

module.exports.argumentBytes = bytes;

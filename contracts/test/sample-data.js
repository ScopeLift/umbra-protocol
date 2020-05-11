const rawData = {
    iv: '0xa632512da339ce66d550da77bb3f5f63',
    ephemeralPublicKey: '0x0471f1bdfb4a6ba73ef514fa5e169b82f4cd5cdddd2545cf5779b499bc39ff6f8f616a0a862df64d893a1044409181a9b80179852a7fab4201fbf54589df109185',
    ciphertext: '0x0e763e72bb34d9d365a3d6b618a612eda20dbd049a0a04f8301e6f35289bff0aa5b1bb2ab9d48c6aef064592a1f3422baebf5dc38d9f383ffaec86d2c15ef366872f8841c361063ae5d6f952857a4c3667bf3e2adefa33abdd949d4c9ce6e26d',
    mac: '0x5907f5443bdaaf0dcd6fe60285f8128afb1a355c27326a483e60e080556dbb43'
}

let bytes = [];

// IV is first bytes16 param
bytes[0] = rawData.iv;

// Emphemeral Pub Key is next 2 bytes32 params
bytes[1] = '0x' + rawData.ephemeralPublicKey.slice(4, 4+64);
bytes[2] = '0x' + rawData.ephemeralPublicKey.slice(4+64, 4+2*64);

// Ciphertext is next 3 bytes32 params
bytes[3] = '0x' + rawData.ciphertext.slice(2, 2+64);
bytes[4] = '0x' + rawData.ciphertext.slice(2+64, 2+2*64);
bytes[5] = '0x' + rawData.ciphertext.slice(2+2*64, 2+3*64);

// MAC is the last bytes32 param
bytes[6] = rawData.mac;

module.exports.argumentBytes = bytes;

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

contract StealthKeyRegistry {
  // =========================================== Events ============================================

  /// @dev Event emitted when a user updates their resolver stealth keys
  event StealthKeyChanged(
    address indexed registrant,
    uint256 spendingPubKeyPrefix,
    uint256 spendingPubKey,
    uint256 viewingPubKeyPrefix,
    uint256 viewingPubKey
  );

  // ======================================= State variables =======================================

  /// @dev The domain typehash used for EIP-712 signatures in setStealthKeysOnBehalf
  bytes32 public constant EIP712DOMAIN_TYPEHASH =
    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

  /// @dev The payload typehash used for EIP-712 signatures in setStealthKeysOnBehalf
  bytes32 public constant STEALTHKEYS_TYPEHASH =
    keccak256(
      "StealthKeys(uint256 spendingPubKeyPrefix,uint256 spendingPubKey,uint256 viewingPubKeyPrefix,uint256 viewingPubKey)"
    );

  /// @dev The domain separator used for EIP-712 sigatures in setStealthKeysOnBehalf
  bytes32 public immutable DOMAIN_SEPARATOR;

  /**
   * @dev Mapping used to store two secp256k1 curve public keys useful for
   * receiving stealth payments. The mapping records two keys: a viewing
   * key and a spending key, which can be set and read via the `setsStealthKeys`
   * and `stealthKey` methods respectively.
   *
   * The mapping associates the user's address to another mapping, which itself maps
   * the public key prefix to the actual key . This scheme is used to avoid using an
   * extra storage slot for the public key prefix. For a given address, the mapping
   * may contain a spending key at position 0 or 1, and a viewing key at position
   * 2 or 3. See the setter/getter methods for details of how these map to prefixes.
   *
   * For more on secp256k1 public keys and prefixes generally, see:
   * https://github.com/ethereumbook/ethereumbook/blob/develop/04keys-addresses.asciidoc#generating-a-public-key
   *
   */
  mapping(address => mapping(uint256 => uint256)) keys;

  /**
   * @dev We wait until deployment to codify the domain separator because we need the
   * chainId and the contract address
   */
  constructor() {
    uint256 _chainId;
    assembly {
      _chainId := chainid()
    }

    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        EIP712DOMAIN_TYPEHASH,
        keccak256(bytes("Umbra Stealth Key Registry")),
        keccak256(bytes("1")),
        _chainId,
        address(this)
      )
    );
  }

  // ======================================= Set Keys ===============================================

  /**
   * Sets the stealth keys associated with an address, for anonymous sends.
   * May only be called by the associated address.
   * @param spendingPubKeyPrefix Prefix of the spending public key (2 or 3)
   * @param spendingPubKey The public key for generating a stealth address
   * @param viewingPubKeyPrefix Prefix of the viewing public key (2 or 3)
   * @param viewingPubKey The public key to use for encryption
   */
  function setStealthKeys(
    uint256 spendingPubKeyPrefix,
    uint256 spendingPubKey,
    uint256 viewingPubKeyPrefix,
    uint256 viewingPubKey
  ) external {
    _setStealthKeys(msg.sender, spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey);
  }

  /**
   * Sets the stealth keys associated with an address, for anonymous sends.
   * May only be called by the associated address.
   * @param registrant The address for which stealth keys are being registered, must also sign
   * @param spendingPubKeyPrefix Prefix of the spending public key (2 or 3)
   * @param spendingPubKey The public key for generating a stealth address
   * @param viewingPubKeyPrefix Prefix of the viewing public key (2 or 3)
   * @param viewingPubKey The public key to use for encryption
   * @param _v ECDSA signature component: Parity of the `y` coordinate of point `R`
   * @param _r ECDSA signature component: x-coordinate of `R`
   * @param _s ECDSA signature component: `s` value of the signature
   */
  function setStealthKeysOnBehalf(
    address registrant,
    uint256 spendingPubKeyPrefix,
    uint256 spendingPubKey,
    uint256 viewingPubKeyPrefix,
    uint256 viewingPubKey,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    // create EIP-712 Digest
    bytes32 digest =
      keccak256(
        abi.encodePacked(
          "\x19\x01",
          DOMAIN_SEPARATOR,
          keccak256(
            abi.encode(STEALTHKEYS_TYPEHASH, spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey)
          )
        )
      );

    // recover the signing address and ensure it matches the registrant
    address _recovered = ecrecover(digest, _v, _r, _s);
    require(_recovered == registrant, "StealthKeyRegistry: Invalid Signature");

    // now that we know the registrant has authorized it, update the stealth keys
    _setStealthKeys(registrant, spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey);
  }

  /**
   * @dev Internal method for setting stealth key that must be called after safety
   * check on registrant; see calling method for parameter details
   */
  function _setStealthKeys(
    address registrant,
    uint256 spendingPubKeyPrefix,
    uint256 spendingPubKey,
    uint256 viewingPubKeyPrefix,
    uint256 viewingPubKey
  ) internal {
    require(
      (spendingPubKeyPrefix == 2 || spendingPubKeyPrefix == 3) &&
        (viewingPubKeyPrefix == 2 || viewingPubKeyPrefix == 3),
      "StealthKeyResolver: Invalid Prefix"
    );

    emit StealthKeyChanged(registrant, spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey);

    // Shift the spending key prefix down by 2, making it the appropriate index of 0 or 1
    spendingPubKeyPrefix -= 2;

    // Ensure the opposite prefix indices are empty
    delete keys[registrant][1 - spendingPubKeyPrefix];
    delete keys[registrant][5 - viewingPubKeyPrefix];

    // Set the appropriate indices to the new key values
    keys[registrant][spendingPubKeyPrefix] = spendingPubKey;
    keys[registrant][viewingPubKeyPrefix] = viewingPubKey;
  }

  // ======================================= Get Keys ===============================================

  /**
   * Returns the stealth key associated with an address.
   * @param registrant The address whose keys to lookup.
   * @return spendingPubKeyPrefix Prefix of the spending public key (2 or 3)
   * @return spendingPubKey The public key for generating a stealth address
   * @return viewingPubKeyPrefix Prefix of the viewing public key (2 or 3)
   * @return viewingPubKey The public key to use for encryption
   */
  function stealthKeys(address registrant)
    external
    view
    returns (
      uint256 spendingPubKeyPrefix,
      uint256 spendingPubKey,
      uint256 viewingPubKeyPrefix,
      uint256 viewingPubKey
    )
  {
    if (keys[registrant][0] != 0) {
      spendingPubKeyPrefix = 2;
      spendingPubKey = keys[registrant][0];
    } else {
      spendingPubKeyPrefix = 3;
      spendingPubKey = keys[registrant][1];
    }

    if (keys[registrant][2] != 0) {
      viewingPubKeyPrefix = 2;
      viewingPubKey = keys[registrant][2];
    } else {
      viewingPubKeyPrefix = 3;
      viewingPubKey = keys[registrant][3];
    }

    return (spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey);
  }
}

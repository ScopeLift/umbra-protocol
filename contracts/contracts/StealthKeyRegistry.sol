// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

contract StealthKeyRegistry {
  /// @dev Event emitted when a user updates their resolver stealth keys
  event StealthKeyChanged(
    address indexed registrant,
    uint256 spendingPubKeyPrefix,
    uint256 spendingPubKey,
    uint256 viewingPubKeyPrefix,
    uint256 viewingPubKey
  );

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
    require(
      (spendingPubKeyPrefix == 2 || spendingPubKeyPrefix == 3) &&
        (viewingPubKeyPrefix == 2 || viewingPubKeyPrefix == 3),
      "StealthKeyResolver: Invalid Prefix"
    );

    emit StealthKeyChanged(msg.sender, spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey);

    // Shift the spending key prefix down by 2, making it the appropriate index of 0 or 1
    spendingPubKeyPrefix -= 2;

    // Ensure the opposite prefix indices are empty
    delete keys[msg.sender][1 - spendingPubKeyPrefix];
    delete keys[msg.sender][5 - viewingPubKeyPrefix];

    // Set the appropriate indices to the new key values
    keys[msg.sender][spendingPubKeyPrefix] = spendingPubKey;
    keys[msg.sender][viewingPubKeyPrefix] = viewingPubKey;
  }

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

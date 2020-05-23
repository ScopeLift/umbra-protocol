<div align="center">
	<img width="400" src="readme/umbra-logo-words.png" alt="Umbra Logo">
	<br />
	<br />
</div>

<p align="center">
	<b>Privacy Preserving Stealth Payments On The Ethereum Blockchain.</b>
</p>

<p align="center">
	🚀 <a href="https://ropsten.umbra.cash">umbra.cash</a>
	👷 <a href="https://twitter.com/msolomon44">@msolomon44</a>
	👷 <a href="https://twitter.com/BenDiFrancesco">@BenDiFrancesco</a>
</p>

<div align="center">
	<img width="150" src="readme/ethereum-badge-light.png" alt="Umbra Logo">
	<br />
</div>

## About

Umbra is protocol for enabling stealth payments on the Ethereum blockchain. It enables privacy preserving transactions where **the receiver's identity is only known to the sender and receiver**.

This repository has three components:

* [Umbra JS](umbra-js/) — A JavaScript library for building Umbra-enabled web3 apps in node.js or in the browser.
* [Umbra Contracts](contracts/) — Solidity contracts used in the Umbra Protocol.
* [Umbra Pay](app/) — Frontend web3 app for setting up and using Umbra, deployed at [https://ropsten.umbra.cash](https://ropsten.umbra.cash)

### FAQ

**What does Umbra do?**

Umbra allows a payer to send funds to a fresh address. That address is controlled by the intended receiver, but only the payer and the receiver know that.

**How is Umbra different from Tornado Cash**

[Tornado Cash](https://tornado.cash/) is awesome and you should use it! It's an on chain mixer that uses zero knowledge proofs. You put funds in, wait a while for other people to do the same, then use your proof to withdrawal them somewhere else. Since everyone's funds are pooled in the mixer, the link between the origin address and withdrawal address is broken.

Umbra is meant for payments between two entities, and comes with a different set of privacy tradeoffs. Rather than *breaking* the link between sending and receiving address, Umbra makes that link *meaningless*. Everyone know the address funds were sent to, but they don't know who controls that address.

**What advantages does Umbra have?**

* Umbra allows arbitrary amounts to be sent, since there is no need for inputs and outputs to be uniform.
* Umbra does not require the receiver to wait to withdraw funds— as soon as they're sent, they can be withdrawn to any address the receiver chooses.
* Umbra ensures only the receiver can withdraw the funds once they're sent. The sender does not hold the private key of the receiving address.
* Umbra uses significantly less gas, as it does not require the verification of any advanced cryptography on chains. All transactions are simple transfers.
* Umbra enables ETH and arbitrary ERC20 tokens to be transferred privately. You're not dependent on a large anonymity set developing for each token.

**Can you give an example of a practical use of Umbra?**

Alice owns a business and hires Bob to subcontract for her. She agrees to pay Bob 1,000 Dai/week for his work.

The first time Bob visits the Umbra app, he sets up his account, enabling hime to be paid privately. Alice uses Umbra to send 1,000 Dai to Bob each week— she only needs to know his ENS address

On chain, we see Alice pays 1,000 Dai to a different and otherwise empty address each week. Behind the scenes, Bob controls the keys to each of these addresses via Umbra, but nobody else knows as much.

Bob uses Umbra to withdraw his 1,000 Dai each week. He only need provide an address to send it to. Obviously, it's best for him to use an address that's not tied to his identity. He usually chooses to send it straight to an exchange, where he sells it for fiat as needed.

Because Umbra uses Gas Station Network and Uniswap, Bob doesn't have to fund the stealth address with Ether to withdraw his Dai. He can pay for gas with the Dai itself. He can also swap directly to any token of his choice, as long as there's a trading pair available on Uniswap.

**How does Umbra actually work?**

Here's a high level description of the mechanics of the Umbra protocol:

1. Users publish signed messages to ENS text records to reveal their Umbra public key. This public key is derived from a random private key specifically generated for use with Umbra.
2. A payer uses this public key, plus some randomly generated data, to create a new 'stealth' address.
3. The payer encrypts the random data with the receiver's public key.
4. The payer sends the funds to the shielded address and sends the encrypted message to Umbra's smart contract. The contract broadcasts the encrypted message as an Event.
5. The receiver scans the encrypted messages broadcast by the Umbra contract until they find one they can decrypt with their private key.
6. The receiver uses the contents of the encrypted message, plus their private key, to generate the private key of the stealth address.
7. The receiver uses the private key of the stealth address to sign a withdrawal transaction, sending the ETH or tokens to the address of their choice.
8. Optionally, the withdrawal transaction is broadcast via [Gas Station Network](https://www.opengsn.org/) transaction relayers, obviating the need to fund the stealth address to access tokens. The Umbra contracts swap some of the tokens via Uniswap to pay the GSN relayer for gas.


## Development

### Instructions

To set up your development environment, clone this repo, and follow the instructions in each of the project component's subdirectories.

* [umbra-js/](umbra-js/)
* [contracts/](contracts/)
* [app/](app/)

### Contributions

Contributions to Umbra are welcome! Fork the project, create a new branch from master, and open a PR. Ensure the project can be fast-forward merged by rebasing if necessary.

## License

Umbra is available under the [MIT](LICENSE.txt) license.
<template>
  <q-page padding class="text-center">
    <h2 class="page-title">Frequently Asked Questions</h2>

    <q-list class="form-extra-wide" separator>
      <!-- Introduction -->
      <div
        @click="copyUrl"
        id="introduction"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Introduction
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-umbra">
        <f-a-q-item :expanded="selectedId === 'what-is-umbra'" question="What is Umbra?">
          <p>
            Umbra is a stealth address protocol for Ethereum. That means it allows a payer to send funds to a fresh
            address. That address is controlled by the intended receiver, but only the payer and the receiver know that.
          </p>
          <p>
            One way to think of Umbra is this: Imagine if, before anyone sent you funds, you sent them a brand new,
            never before used address. Only the sender would know you control that address, which adds a layer of
            privacy to your payment. Payments via Umbra work similarly, but are non-interactive—you don’t need to give
            someone a fresh address, they can just generate one they know only you will be able to access.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="can-you-walk-me-through-an-example">
        <f-a-q-item
          :expanded="selectedId === 'can-you-walk-me-through-an-example'"
          question="Can you walk me through an example?"
        >
          <p>
            Alice owns a business and hires Bob to subcontract for her. She agrees to pay Bob 1,000 Dai/week for his
            work. Bob owns the ENS address <span class="code">bob.eth</span>. If Alice sent the funds each week to
            <span class="code">bob.eth</span>, anyone looking at the chain could trivially know that Alice is paying Bob
            1,000 Dai each week.
          </p>
          <p>
            Instead, Bob and Alice will use Umbra for private payments. The first time Bob visits the Umbra app, he sets
            up his account with ENS, enabling anyone to privately pay him using the name
            <span class="code">bob.eth</span>. Alice then uses Umbra to send 1,000 Dai to Bob each week— she only needs
            to know his ENS name.
          </p>
          <p>
            On chain, we see Alice pays 1,000 Dai to a new empty address each week. Behind the scenes, Bob controls the
            keys to each of these addresses via Umbra, but nobody except Alice and Bob knows this.
          </p>
          <p>
            Bob uses Umbra to withdraw his 1,000 Dai each week. He only needs to provide an address to send it to. It’s
            best for him to use an address that’s not tied to his identity. He usually chooses to send it straight to an
            exchange, where he sells it for fiat as needed.
          </p>
          <p>
            Consider another example: Liza runs a website that asks for donations. If everyone donated by directly
            sending her funds, everyone would know how much Liza received in donations. If donations were sent with
            Umbra instead, each donation would be sent to a different address, and only Liza would know the total amount
            of donations she received.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-does-it-work">
        <f-a-q-item :expanded="selectedId === 'how-does-it-work'" question="How does it work?">
          <p>Below is a high level description of how Umbra works:</p>
          <ol>
            <li>
              When setting up your Umbra account, users sign a message. The hash of this message is used to generate two
              private keys—a "spending key" and a "viewing key".
            </li>
            <li>
              The corresponding public keys are both published on-chain as records associated with your ENS or CNS name.
            </li>
            <li>
              A payer uses your ENS or CNS name to look up your two public keys. Separately, the payer generates a
              random number.
            </li>
            <li>
              The random number is used with the spending public key to generate a "stealth address" to send funds to.
              The same random number is used with the viewing public key to encrypt the random number.
            </li>
            <li>
              Using the Umbra contract, the payer sends funds to the stealth address and the encrypted data is emitted
              as an <span class="code">Announcement</span> event.
            </li>
            <li>
              The receiver scans all <span class="code">Announcement</span> events from the Umbra contract. For each,
              they use their viewing private key to decrypt the random number, then multiply that number by their
              spending private key to generate the stealth private key. If the stealth private key controls the address
              funds were sent to, this payment was for the receiver
            </li>
            <li>
              The receiver can now use the private key to either directly send the transaction required to withdraw
              funds to another address, or sign a meta-transaction to have the withdrawal request processed by a
              relayer.
            </li>
          </ol>
          <p>
            See the "<span class="hyperlink" @click="expandAndScrollToElement('how-does-it-work-technical')"
              >Technical Details: How does it work?</span
            >" section for more details.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-private-is-umbra">
        <f-a-q-item :expanded="selectedId === 'how-private-is-umbra'" question="How private is Umbra?">
          <p>
            Umbra offers a limited set of privacy guarantees and it’s important to understand them before using the
            protocol. Umbra does <span class="text-bold">not</span> offer "full" privacy like Aztec or Zcash. It simply
            makes it impossible for any outside observers (i.e. anyone who is not the sender or the receiver) to know
            who the sender paid by looking at the receiving address.
          </p>
          <p>
            It’s important to understand that poor hygiene by the receiver— for example, sending the funds directly to a
            publicly known address— eliminates the privacy benefits for both the sender and receiver.
          </p>
          <p>
            The privacy properties of Umbra can also be diminished if an observer can narrow down the set of potential
            recipients for a given a transaction. Any valid public key can be used as a recipient, and anyone who has
            sent a transaction on Ethereum has a publicly available public key. Therefore, by default, the "anonymity
            set"—the set of potential recipients of a transaction—is anyone who has ever sent an Ethereum transaction!
          </p>
          <p>
            In practice this isn’t necessarily the case, and an observer may be able to narrow down the list of
            recipients in a few ways:
          </p>
          <ol>
            <li>
              Most users will use ENS names to send funds, so the recipient most likely has published keys under an ENS
              name
            </li>
            <li>
              Poor hygeine when withdrawing funds from your stealth addresses can reduce or entirely remove the privacy
              properties provided by Umbra. See the "What address are safe for withdrawing funds to?" for more details.
              Always use caution when withdrawing!
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-does-umbra-compare-to-tornado-cash-and-aztec">
        <f-a-q-item
          :expanded="selectedId === 'how-does-umbra-compare-to-tornado-cash-and-aztec'"
          question="How does Umbra compare to Tornado Cash and Aztec?"
        >
          <p>
            Tornado Cash is an on chain mixer that uses zero knowledge proofs. You deposit funds and receive a secret
            note, wait a while for other people to do the same, then use your note to prove you own some of the
            deposited funds and withdraw them to another address. Since everyone’s funds are pooled in the mixer, the
            link between the deposit address and withdrawal address is broken.
          </p>
          <p>
            Aztec is a privacy-focused Layer 2 solution, that also uses zero knowledge proofs. You deposit funds from
            Layer 1 (mainnet) into Aztec, and your funds effectively become "wrapped" in a private version. Regular
            transfers become private by befault, meaning no one knows who you sent funds to, or how much you paid them.
            Balances are often private, so no one can see how much money you’re holding.
          </p>
          <p>
            Umbra is different than both of these and does not use zero knowledge proofs. Instead, Umbra is based on
            ordinary elliptic curve cryptography. It’s meant for payments between two entities, and comes with a
            different set of privacy tradeoffs. Rather than breaking the link between sending and receiving address,
            like Tornado does, Umbra makes that link meaningless. Everyone can see who sent the funds, and everyone can
            see the address funds were sent to, but that receiving addresss has never been seen on-chain so it’s
            impossible for any outside observers to know who controls it.
          </p>
        </f-a-q-item>
      </div>

      <!-- Account Setup -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="account-setup"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Account Setup
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-account-setup">
        <f-a-q-item :expanded="selectedId === 'what-is-account-setup'" question="What is account setup?">
          <p>
            A User signs a message, and from that an Umbra public key and private key are generated. A transaction is
            made on the ENS registry associating this Umbra key with your ENS name.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="is-account-setup-required">
        <f-a-q-item :expanded="selectedId === 'is-account-setup-required'" question="Is account setup required?">
          <p>This step is not required, but is strongly recommended for two reasons:</p>
          <ol>
            <li>
              Convenience: Setting up ENS makes it easy for anyone to send you stealth payments with a human readable
              address
            </li>
            <li>
              Security: In order to access stealth funds, the Umbra app needs your private keys. Inputting your wallet’s
              private keys into any website is very dangerous, and we don’t want you do to that! By going through the
              account setup process, you sign a message to generate an app-specific set of Umbra private keys. This is
              much more secure, as Umbra never has your wallet’s private key.
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="should-i-use-my-own-ens-cns-name-or-an-umbra.eth-subdomain">
        <f-a-q-item
          :expanded="selectedId === 'should-i-use-my-own-ens-cns-name-or-an-umbra.eth-subdomain'"
          question="Should I use my own ENS/CNS name or an umbra.eth subdomain?"
        >
          <p>
            This is up to you, but there’s a few factors to consider here. Arguments in favor of an
            <span class="code">umbra.eth</span> subdomain include:
          </p>
          <ol>
            <li>
              New account privacy: This is your standard ENS/CNS privacy issue— if you publicly share your ordinary
              name, everyone can see what funds are in your regular wallet. If you use a brand new
              <span class="code">umbra.eth</span> name with a new address, you’ll have no funds in it, giving you an
              extra bit of privacy to start with. This choice does not impact the privacy of funds received via Umbra in
              any way.
            </li>
            <li>
              Convenience: Using a <span class="code">umbra.eth</span> name is a smoother and cheaper setup process. It
              only takes one on-chain transaction, whereas configuring an existing name requires three on-chain
              transactions (see "Why are there so many transactions to setup my account?" for more info on this).
            </li>
          </ol>
          <p>Arguments in favor of using your existing ENS/CNS name include:</p>
          <ol>
            <li>
              Convenience: Everyone already knows your public ENS/CNS name, and you don’t want to deal with maintaining
              two names or sharing a new ENS name.
            </li>
            <li>
              Security: As the owner of your ENS/CNS name, there is no third-party that can ever control your public key
              configuration except you. See "<span
                class="hyperlink"
                @click="expandAndScrollToElement('can-my-subdomain-be-revoked')"
                >Can my subdomain be revoked?</span
              >" for more information.
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-are-there-so-many-transactions-to-setup-my-account">
        <f-a-q-item
          :expanded="selectedId === 'why-are-there-so-many-transactions-to-setup-my-account'"
          question="Why are there so many transactions to setup my account?"
        >
          <p>
            Most ENS users are using the default Public Resolver, but in order to store your app-specific public keys in
            a gas-efficient way, Umbra relies on it’s own Stealth Key Resolver. This resolver falls back to the Public
            Resolver for anything not related to stealth keys, so it can do everything the public resolver can and more.
            This means you will not lose any functionality by switching to it.
          </p>
          <p>This migration from the Public Resolver to the Stealth Key Resolver takes 3 transactions:</p>
          <ol>
            <li>
              Authorize the Stealth Key Resolver to set records on the Public Resolver on your behalf. This is required
              so the Stealth Key Resolver can act as a fallback resolver with permission to set records on Public
              Resolver whenver requested.
            </li>
            <li>Set your stealth keys on the Stealth Key Resolver</li>
            <li>Set your new resolver as the Stealth Key Resolver</li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="can-my-subdomain-be-revoked">
        <f-a-q-item :expanded="selectedId === 'can-my-subdomain-be-revoked'" question="Can my subdomain be revoked?">
          <p>
            In ENS, the owner of a root domain has control of the associated subdomains. We’ve delegated that control to
            a
            <a
              class="hyperlink"
              href="https://github.com/ScopeLift/ens-resolvers/blob/master/contracts/StealthKeyFIFSRegistrar.sol"
              target="_blank"
              >smart contract</a
            >
            that allows anyone to claim and configure an Umbra subdomain, but as owners of the root
            <span class="code">umbra.eth</span> domain, we still have the ability to override this.
          </p>
          <p>
            To mitigate this risk to users, we intend to transfer ownership of <span class="code">umbra.eth</span> to a
            multi-sig address with publicly known participants, however that step has not yet been taken. While we can
            promise you that we won’t use this capability, your risk assessment should include that we can. If you’ll be
            receiving large, frequent payments via Umbra, then configuring your own ENS/CNS name remains the safest
            route.
          </p>
        </f-a-q-item>
      </div>

      <!-- Sending Funds -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="sending-funds"
        isHeader="true"
        class="cursor-pointer link-icon-parent cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Sending Funds
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="why-are-only-certain-tokens-available">
        <f-a-q-item
          :expanded="selectedId === 'why-are-only-certain-tokens-available'"
          question="Why are only certain tokens available?"
        >
          <p>
            When you send ETH, the ETH is sent directly to the computed stealth address. That stealth address now has
            ETH, which is required to pay gas, so the receiver can easily transfer that ETH with an ordinary send.
          </p>
          <p>
            When you send tokens, the tokens are not sent directly to the computed stealth address. If they were, you’d
            first need to get ETH into the stealth address in order to pay for the gas to withdraw funds (or use some
            costly CREATE2 schemes). Instead, the tokens are held by the contract and can be released in one of two
            ways:
          </p>
          <ol>
            <li>The stealth address directly calls the <span class="code">withdrawToken()</span> method</li>
            <li>
              Anyone calls <span class="code">withdrawTokenOnBehalf()</span> and passses in a signature from the stealth
              address. This enables meta-transactions to be used with the relayer of your choice.
            </li>
          </ol>
          <p>
            By default, the Umbra app uses a relayer from the Umbra team. Managing relayers and making sure you are
            properly reimbursed for gas fees can be tricky, so to start only a few tokens are enabled and the list of
            supported tokens will be expanded.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="when-will-the-recipient-receive-their-funds">
        <f-a-q-item :expanded="selectedId === false" question="When will the recipient receive their funds?">
          <p>
            Immediately! The recipient recieives and can withdraw funds immediately after the send transaction is mined.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-is-the-maximum-memo-length-so-short">
        <f-a-q-item
          :expanded="selectedId === 'why-is-the-maximum-memo-length-so-short'"
          question="Why is the maximum memo length so short?"
        >
          <p>
            Recall that the sender generates a random number, and uses it compute the receiver’s stealth address. This
            random number is 32 bytes. However, 16 bytes of randomness is sufficient for security, meaning you have 16
            free bytes to do whatever you want with. These 16 free bytes are what we call the
            <span class="text-italic">payload extension</span>. The app uses the payload extension to allow you to send
            short memos with your payment.
          </p>
        </f-a-q-item>
      </div>

      <!-- Receiving Funds -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="receiving-funds"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Receiving Funds
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-addresses-are-safe-for-withdrawing-funds-to">
        <f-a-q-item
          :expanded="selectedId === 'what-addresses-are-safe-for-withdrawing-funds-to'"
          question="What addresses are safe for withdrawing funds to?"
        >
          <p>
            We suggest 3 ways of withdrawing in a privacy-preserving way. Note that each comes with its own set of
            tradeoffs.
          </p>
          <ol>
            <li>
              Withdraw to an address that is not publicly associated with your identity (tradeoff: the sender will now
              be able to infer you control that address)
            </li>
            <li>
              Generate a new address and withdraw into that (tradeoff: if you’ve received tokens, you’ll have to fund
              that address with ETH for gas before you can use them)
            </li>
            <li>
              Withdraw to an exchange address (tradeoff: if you withdraw to Coinbase, then Coinbase will know who sent
              you funds)
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-addresses-are-not-safe-for-withdrawing-funds-to">
        <f-a-q-item
          :expanded="selectedId === 'what-addresses-are-not-safe-for-withdrawing-funds-to'"
          question="What addresses are NOT safe for withdrawing funds to?"
        >
          <p>
            The risk to consider when withdrawing is that if you withdraw to an address that is associated with some
            publicly known identity, then privacy is lost as follows:
          </p>
          <p>
            Let’s say Alice sends funds to Bob via Umbra. Right now, only Alice and Bob know that Alice paid Bob. Any
            other observers know Alice sent funds to someone, but they don’t know who that someone is.
          </p>
          <p>
            If Bob withdraws those funds to his publicly known <span class="code">bob.eth</span> address, which resolves
            to <span class="code">0x123...def</span>, then observers know one of two things happened:
          </p>
          <ol>
            <li>Scenario 1: Alice sent funds to Bob, then Bob withdrew them to his own address, OR</li>
            <li>Scenario 2: Alice sent funds to someone that knows Bob, and paid Bob from their stealth address</li>
          </ol>
          <p>
            Additionally, consider the case where Bob withdraws by directly paying his friend Charlie—Charlie now knows
            that Alice paid Bob.
          </p>
          <p>
            To help mitigate this, the Umbra app will try to warn you if you enter a withdrawal address that might
            reduce your privacy. Therefore you’ll see warnings if the app detects you are withdrawing to an address
            that:
          </p>
          <ol>
            <li>Has an ENS or CNS name</li>
            <li>Owns POAP tokens</li>
            <li>Is the wallet you are logged in with</li>
            <li>(Coming soon): Withdrawing to an address that has contributed to Gitcoin.</li>
          </ol>
          <p>
            This is <span class="text-bold">not</span> a comprehensive list of potentially dangerous withdrawal
            addresses, so use caution.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="can-umbra-make-it-easier-to-withdraw-funds-in-a-privacy-preserving-way">
        <f-a-q-item
          :expanded="selectedId === 'can-umbra-make-it-easier-to-withdraw-funds-in-a-privacy-preserving-way'"
          question="Can Umbra make it easier to withdraw funds in a privacy preserving way?"
        >
          <p>
            Yes! This is an area where we intend to make many improvements in the future, mostly by relying on Umbra’s
            post-withdrawal hook functionality.
          </p>
          <p>Some examples of how we plan to leverage this include:</p>
          <ol>
            <li>Withdraw straight into Tornado Cash</li>
            <li>Atomically swap some tokens to ETH and send all of it to a fresh address</li>
            <li>Withdraw funds straight into DeFi protocols</li>
          </ol>
          <p>
            There are many other options which we can pursue via hooks to greatly expand the privacy preserving
            withdrawal options.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-does-it-take-so-long-to-scan-for-my-funds">
        <f-a-q-item
          :expanded="selectedId === 'why-does-it-take-so-long-to-scan-for-my-funds'"
          question="Why does it take so long to scan for my funds?"
        >
          <p>
            To find payments sent to you, the app needs to search through every payment that was sent and check if it
            was for you. So the more payments that have been sent, the longer this will take.
          </p>
          <p>
            This is an open research problem with various potential solutions (
            <a
              class="hyperlink"
              href="https://ethresear.ch/t/open-problem-improving-stealth-addresses/7438"
              target="_blank"
              >1</a
            >, <a class="hyperlink" href="https://eprint.iacr.org/2021/089.pdf" target="_blank">2</a>), and we hope to
            improve this over time.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="when-are-my-funds-available-to-withdraw">
        <f-a-q-item
          :expanded="selectedId === 'when-are-my-funds-available-to-withdraw'"
          question="When are my funds available to withdraw?"
        >
          <p>Immediately! You recieive and can withdraw funds immediately after the send transaction is mined.</p>
        </f-a-q-item>
      </div>

      <!-- Security -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="security"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Security
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="has-umbra-been-audited">
        <f-a-q-item :expanded="selectedId === 'has-umbra-been-audited'" question="Has Umbra been audited?">
          <p>
            The
            <a
              class="hyperlink"
              href="https://github.com/ScopeLift/umbra-protocol/tree/master/contracts"
              target="_blank"
              >contracts</a
            >
            have been audited by ConsenSys Diligence, and the audit report can be found
            <a
              class="hyperlink"
              href="https://consensys.net/diligence/audits/2021/03/umbra-smart-contracts/"
              target="_blank"
              >here</a
            >.
          </p>
          <p>
            The <span class="code">umbra-js</span>&#32;
            <a class="hyperlink" href="https://github.com/ScopeLift/umbra-protocol/tree/master/umbra-js" target="_blank"
              >library</a
            >&mdash;responsible for handling the required off-chain logic and elliptic curve operations&mdash;has been
            audited by Least Authority, and the audit report can be found
            <a
              class="hyperlink"
              href="https://leastauthority.com/static/publications/LeastAuthority_ScopeLift_Umbra-js_Final_Audit_Report.pdf"
              target="_blank"
              >here</a
            >.
          </p>
          <p>
            Off-chain elliptic curve operations are a core part of Umbra’s business logic, so we rely on
            <a class="hyperlink" href="https://paulmillr.com/" target="_blank">Paul Miller</a>’s simple, zero-dependency
            <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1" target="_blank">noble-secp256k1</a>
            library to handle this. Thanks to the
            <a
              class="hyperlink"
              href="https://gitcoin.co/grants/2451/audit-of-noble-secp256k1-cryptographic-library"
              target="_blank"
              >community</a
            >, we were able to raise enough funds to pay for an audit of this library with Cure53. You can read the
            audit report
            <a class="hyperlink" href="https://cure53.de/pentest-report_noble-lib.pdf" target="_blank">here</a>.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-the-risks-of-umbra">
        <f-a-q-item :expanded="selectedId === false" question="What are the risks of Umbra?">
          <p>
            Like all software in the crypto ecosystem, using Umbra comes with risks. This includes risks of critical
            bugs, hacks, or other attacks from malicious actors. Any or all of these scenarios could result in a loss of
            funds.
          </p>
          <p>To be more specific, here are a few of the risks we’ve seen play out with other projects in the past:</p>
          <ol>
            <li>Contract vulnerabilities that allow attackers to steal contract funds or leaves them stuck</li>
            <li>A bug in our off-chain code that causes funds to be sent to an unrecoverable address</li>
            <li>DNS being hijacked to steal user’s private keys</li>
            <li>Supply chain attacks of frontend code to steal user’s private keys</li>
          </ol>
          <p>
            It goes without saying that we’re working hard to prevent these, but that does not mean we’ll succeed. Umbra
            is provided with absolutely no warranty, and you should use it at your own risk.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="is-cryptography-in-javascript-secure">
        <f-a-q-item
          :expanded="selectedId === 'is-cryptography-in-javascript-secure'"
          question="Is cryptography in JavaScript secure?"
        >
          <p>
            In general, a JavaScript execution environment is not ideal for meeting security requirements. It presents
            challenges in hiding secret data in memory (e.g. your app-specific private keys) and preventing that data
            from being written to disk. Using JavaScript also means the underlying cryptography library may be
            susceptible to things like
            <a class="hyperlink" href="https://en.wikipedia.org/wiki/Timing_attack" target="_blank">timing attacks</a>.
            Umbra uses
            <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1" target="_blank">noble-secp256k1</a>
            for all cryptography, and you can read more about its limitations and mitigation to such vulnerabilities
            <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1/#security" target="_blank">here</a>.
          </p>
          <p>
            However, the Ethereum ecosystem consists of many wallets and applications that rely on JavaScript
            cryptography and so far there have been no major issues as a result of this, so this approach is likely a
            suitable trade-off for most users.
          </p>
        </f-a-q-item>
      </div>

      <!-- Technical Details -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="technical-details"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Technical Details
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-networks-is-umbra-deployed-on-and-what-are-the-contract-addresses">
        <f-a-q-item
          :expanded="selectedId === 'what-networks-is-umbra-deployed-on-and-what-are-the-contract-addresses'"
          question="What networks is Umbra deployed on and what are the contract addresses?"
        >
          Umbra is deployed at 0xTODO on mainnet and Rinkeby.
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-does-it-work-technical">
        <f-a-q-item :expanded="selectedId === 'how-does-it-work-technical'" question="How does it work?">
          <p class="text-bold">Stealth Address Overview</p>
          <p>Let’s start with how the Umbra protocol (and more generally, how stealth addresses) work:</p>
          <p>
            The recipient has public key <span class="code">P</span> and private key <span class="code">p</span>. The
            sender generates a random number <span class="code">r</span>, and computes a stealth public key as
            <span class="code">P_stealth = P * r</span> using elliptic curve multiplication. The sender derives the
            Ethereum address <span class="code">a_stealth</span> from that public key, and sends funds to it. Thanks to
            the magic of elliptic curve math, the recipient can generate the private key
            <span class="code">p_stealth</span> needed to access funds at <span class="code">a_stealth</span> by
            computing <span class="code">p_stealth = p * r</span>.
          </p>
          <p>
            T The first problem to solve is how does the sender get the value <span class="code">r</span> to the
            receiver? If <span class="code">r</span> was publicly known, oberservers could determine who funds were sent
            to by computing <span class="code">P * r</span> for various published <span class="code">P</span> values
            until the find the stealth address. So <span class="code">r</span> needs to be encrypted.
          </p>
          <p>
            Encryption is done with
            <a
              class="hyperlink"
              href="https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman"
              target="_blank"
              >Elliptic Curve Diffie-Hellman</a
            >
            (ECDH), meaning the sender uses the recipient’s public key to encrypt the random number. The encrypted
            random number gives us the cipertext <span class="code">c</span>. The encrypted random number
            <span class="code">c</span> and stealth address <span class="code">a_stealth</span> are emitted as an
            <span class="code">Annoucement</span> event from the Umbra contract. ECDH requires the sender to generate an
            ephemeral private key for encryption, so the ephemeral public key <span class="code">P_ephemeral</span> that
            the receiver will need to decrypt is also emitted in this event.
          </p>
          <p>
            Now the receiver can scan through all <span class="code">Announcement</span> events and find their funds as
            follows:
          </p>
          <ul>
            <li>
              Using their private key <span class="code">p</span> with <span class="code">P_ephemeral</span>, they can
              compute the ECDH shared secret and decrypt the random number. This will always decrypt to
              <span class="text-italic">something</span>, but we don’t yet know if it decrypted to the correct number.
            </li>
            <li>
              So the recipient multiplies the decrypted random number by <span class="code">p</span> to get
              <span class="code">p_stealth</span>, and computes the address controlled by
              <span class="code">p_stealth</span>
            </li>
            <li>
              If the address controlled by <span class="code">p_stealth</span> matches the
              <span class="code">a_stealth</span> stealth address included in the <span class="code">Annoucement</span>,
              the recipient knows that payment was for them and can withdraw it using
              <span class="code">p_stealth</span>.
            </li>
          </ul>
          <p class="text-bold">Application Private Key</p>
          <p>
            As seen from the above explanation, the app will need access to your private key to perform the required
            math. But when you connect your wallet to an app, the wallet does not share your private key with the app.
            This is good, because if it did any app you use could steal your funds! So how does Umbra access your key?
            There’s a few options:
          </p>
          <ol>
            <li>
              Ask the user to input their wallet’s private key into a form. This is terrible from both a security and
              user-experience perspective, so we do not do this
            </li>
            <li>
              Generate a random private key and ask you to back it up. This works, but having to backup an app-specific
              secret is not ideal.
            </li>
            <li>Ask the user to sign a message, hash the signature, and generate the key from the signature.</li>
          </ol>
          <p>
            Option 3 solves the issues of otpions 1 and 2, and is the approach used by the app. Similar approaches are
            used by <a class="hyperlink" href="https://loopring.org/#/" target="_blank">Loopring</a> and
            <a class="hyperlink" href="https://zksync.io/" target="_blank">zkSync</a> as well, and they were the
            inspiration for this approach.
          </p>
          <p class="text-bold">Scanning for Funds</p>
          <p>
            The final consideration has to do with scanning. Because every single
            <span class="code">Announcement</span> needs to be scanned, it can take a long time to find your finds.
          </p>
          <p>
            One way to speed this up (from the user's perspective) is to delegate scanning to a third-party service and
            have them notify you when you receive funds. But the scanning service needs your private key
            <span class="code">p</span> to determine if you received funds, and if they have
            <span class="code">p</span> they can steal your funds!
          </p>
          <p>
            We can solve this by instead generating two application-specific private keys. One private key will be the
            viewing private key, <span class="code">p_view</span>, used for encrypting the random number. The other will
            be the spending private key, <span class="code">p_spend</span>, used for computing the stealth address and
            accessing those funds. Therefore, our send and receive flow is now modified a bit to:
          </p>
          <ol>
            <li>
              Recipient has two private keys, <span class="code">p_spend</span> and <span class="code">p_view</span>,
              and publishes the corresponding public keys <span class="code">P_spend</span> and
              <span class="code">P_view</span>.
            </li>
            <li>
              The sender generates a random number <span class="code">r</span> and encrypts it using
              <span class="code">P_view</span> and an ephemeral private key <span class="code">p_ephemeral</span> to
              generate a ciphertext <span class="code">c</span>
            </li>
            <li>
              The sender computes the stealth address as the address derived from
              <span class="code">P_stealth = P_spend * r</span> and sends funds to that address
            </li>
            <li>
              The Umbra contract emits <span class="code">c</span>, <span class="code">P_ephemeral</span>, and stealth
              address <span class="code">a_stealth</span>
            </li>
            <li>
              For each event, the receiver uses <span class="code">p_view</span> and
              <span class="code">P_ephemeral</span> to decrypt <span class="code">r</span>, then checks if
              <span class="code">p_stealth = p_spend * r</span> is the private key that controls a_stealth
            </li>
          </ol>
          <p>
            With this approach, the recipient can provide a third-party scanning service with
            <span class="code">p_view</span> and <span class="code">P_spend</span>. The service can now check if the
            recipient has received funds without having the ability to spend them.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-spending-and-viewing-keys">
        <f-a-q-item
          :expanded="selectedId === 'what-are-spending-and-viewing-keys'"
          question="What are spending and viewing keys?"
        >
          Borrowing the
          <a class="hyperlink" href="https://electriccoin.co/blog/explaining-viewing-keys/" target="_blank"
            >nomenclature</a
          >
          from Zcash, Umbra allows, but does not require, users to use different private keys for the "encrypt random
          number" and "compute stealth address" steps. This is the default behavior of the Umbra app, but it can be
          overriden by using Advanced Mode.
          <p>
            See "<span class="hyperlink" @click="expandAndScrollToElement('how-does-it-work-technical')"
              >Technical Details: How does it work?</span
            >" for more details on how spending and viewing keys work.
          </p>
        </f-a-q-item>
      </div>

      <!-- Advanced Mode -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="advanced-mode"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        Advanced Mode
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-advanced-mode">
        <f-a-q-item :expanded="selectedId === 'what-is-advanced-mode'" question="What is Advanced Mode?">
          <p>
            For power users who understand the protocol, how it works, and the risks involved, you may want to enable
            Advanced Mode. This provides a range of additional capabilities, but improper use can result in privacy
            being reduced or funds being lost. Use with caution!
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-do-i-send-funds-to-a-user-by-their-address-or-public-key">
        <f-a-q-item
          :expanded="selectedId === 'how-do-i-send-funds-to-a-user-by-their-address-or-public-key'"
          question="How do I send funds to a user by their address or public key?"
        >
          <p>
            As long as a user has sent at least one transaction on Ethereum, you can send funds to a stealth address
            they control even if they have not setup an ENS name for use with Umbra. This works as follows:
          </p>
          <ol>
            <li>Enable Advanced Mode</li>
            <li>Navigate to the Send page and connect your wallet</li>
            <li>
              The recipient field normally only accepts ENS/CNS names, but it will now also accept a public key, an
              address, or even a transaction hash! (Using a transaction hash is effectively the same as entering the
              <span class="code">from</span> address of that transaction)
            </li>
            <li>Continue to send funds like normal</li>
          </ol>
          <p>Be aware of the following tradeoffs incurred when sending funds this way:</p>
          <ol>
            <li>This transaction does not use separate spending and viewing keys, and the same key is used for each</li>
            <li>
              To withdraw funds from the app, the recipient must enable Advanced Mode and manually paste their private
              key into the website. This is the big tradeoff, so make sure the recipient is ok with this before sending
              funds this way.
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-access-funds-sent-to-me-by-using-my-address-as-the-recipient-identifier">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-access-funds-sent-to-me-by-using-my-address-as-the-recipient-identifier'"
          question="How can I access funds sent to me by using my address as the recipient identifier?"
        >
          <p>
            If funds were sent to you by using your public key directly, your address, or a transaction hash of a
            transaction you sent, your funds can still be accessed.
          </p>
          <p>The most secure way to do this is locally using the <span class="code">umbra-js</span> package:</p>
          <ol>
            <li>Setup a local JavaScript project with <span class="code">yarn init</span></li>
            <li>Install ethers.js and umbra-js using <span class="code">yarn add ethers @umbra/umbra-js</span></li>
            <li>
              In your script, perform the following:
              <ol>
                <li>Connect to a mainnet provider with ethers</li>
                <li>
                  Initialize an instance of the Umbra class with
                  <span class="code">const umbra = new Umbra(provider, 1)</span>
                </li>
                <li>
                  Initialize an instance of the KeyPair class with your address’ private key,
                  <span class="code">const keyPair = new KeyPair(myPrivateKey)</span>
                </li>
                <li>
                  Use the <span class="code">umbra.scan()</span> method to search for your funds. The
                  <span class="code">viewingPrivateKey</span> input is now be given by
                  <span class="code">keyPair.privateKeyHex</span>, and the
                  <span class="code">spendingPublicKey</span> input is given by
                  <span class="code">keyPair.publicKeyHex</span>
                </li>
                <li>
                  For each <span class="code">Announcement</span>, you can use the static method
                  <span class="code"
                    >Umbra.computeStealthPrivateKey(keyPair.privateKeyHex, announcement.randomNumber)</span
                  >
                  to compute the stealth private key
                </li>
              </ol>
            </li>
            <li>
              Now that you have the stealth private key(s), you can sign and relay withdrawal transactions using any
              method you prefer. See the various withdrawal methods in the Umbra class that may be helpful here.
            </li>
          </ol>
          <p>
            If you prefer convenience over security, you can instead withdraw using the Umbra app, but be
            careful—entering your private key into a website is never a good idea! If you do want to go this route:
          </p>
          <ol>
            <li>Enable Advanced Mode</li>
            <li>Navigate to the Receive page and connect your wallet</li>
            <li>Before scanning, enter the appropriate private key in the form</li>
            <li>Leave the start block and end block fields blank if you don’t need them</li>
            <li>Click "Scan" to scan for funds</li>
          </ol>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-scan-just-certain-range-of-blocks">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-scan-just-certain-range-of-blocks'"
          question="How can I scan just certain range of blocks?"
        >
          <p>
            If you have an idea of approximately when you were sent funds, you can speed up the scanning process of only
            querying events within a certain range of blocks. To do this:
          </p>
          <ol>
            <li>Enable Advanced Mode</li>
            <li>Navigate to the Receive page and connect your wallet</li>
            <li>Before scanning, enter the desired start and end block numbers</li>
            <li>Leave the private key field blank if you don’t need it</li>
            <li>Click "Scan" to scan for funds</li>
          </ol>
          <p>
            The start and end block numbers will be saved in local storage and automatically applied next time you scan
            with advanced mode on. Leave both fields blank to clear the values and use the defaults.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-view-the-stealth-private-keys">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-view-the-stealth-private-keys'"
          question="How can I view the stealth private keys?"
        >
          If you want to see the stealth private key for a certain payment you received:
          <ol>
            <li>Enable Advanced Mode</li>
            <li>Navigate to the Receive page and scan for funds</li>
            <li>For transactions that have not been withdrawn, click "Withdraw" to expand the row</li>
            <li>
              You’ll see text that says "Show withdrawal private key", which will show the stealth private key needed to
              withdraw this payment
            </li>
          </ol>
        </f-a-q-item>
      </div>

      <!-- For Developers -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="for-developers"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        For Developers
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="how-can-i-build-on-top-of-umbra">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-build-on-top-of-umbra'"
          question="How can I build on top of Umbra?"
        >
          <p>
            Developer documentation is not yet written, but all code is thoroughly commented so it should be
            straightforward to read the code to understand how things work and build on top of it.
          </p>
          <p>
            The umbra-js library is a good starting point, as it will give you the full, big picture view of how Umbra
            works, as well as go into the details. Afterwards, you can check out the contract and to understand exactly
            where it fits in.
          </p>
          <p>
            The below should be a good order for traversing the umbra-js codebase. If you find this confusing, please
            let us know what a better order would be!
          </p>
          <ol>
            <li>
              <span class="code">src/classes/Umbra.ts</span>: The <span class="code">Umbra</span> class is a high-level
              class intended for developers to directly interact with. It abstracts away the complexity of the protocol
              into a few main methods:
              <ol>
                <li>
                  <span class="code">send()</span> is used to send funds to another user, and automatically handles the
                  underlying cryptography required
                </li>
                <li>
                  <span class="code">generatePrivateKeys()</span> prompts the user for a signature and generates their
                  spending and viewing keys.
                  <span class="text-italic">
                    Note: make sure the wallet being used supports deterministic ECDSA signatures with
                    <a class="hyperlink" href="https://tools.ietf.org/html/rfc6979" target="_blank">RFC 6979</a>.
                  </span>
                </li>
                <li>
                  <span class="code">scan()</span> lets you find funds sent to the specified user, by providing just the
                  user’s spending public key and viewing private key
                </li>
                <li>
                  <span class="code">withdraw()</span> lets a stealth address directly withdraw both tokens and ETH
                </li>
                <li>
                  <span class="code">withdrawOnBehalf()</span> uses meta-transactions to relay a withdraw transaction on
                  behalf of another user, and the <span class="code">signWithdraw()</span> method is used to get the
                  required signature
                </li>
                <li>
                  <span class="code">relayWithdrawOnBehalf()</span> can be used to relay a meta-transaction using the
                  default Umbra relayer
                </li>
              </ol>
            </li>
            <li>
              <span class="code">src/classes/KeyPair.ts</span>: This class is where the core cryptography logic lives. A
              <span class="code">KeyPair</span> class is instantiated with either a private or public key, and the class
              methods help you perform various operations with those keys, including encryption/decryption,
              multiplication, and compression/decompression of public keys
            </li>
            <li>
              <span class="code">src/classes/RandomNumber.ts</span>: This simple class is used to generate our 32 byte
              random number, and will properly format the number when provided an optional 16 byte payload extension
            </li>
            <li>
              <span class="code">src/classes/DomainService.ts</span>: Since Umbra supports both ENS and CNS, this class
              wraps around the two name services to help get or set public keys for the provided name. The two files
              files class delegates to are <span class="code">src/utils/ens.ts</span> and
              <span class="code">src/utils/cns.ts</span>.
            </li>
            <li>
              <span class="code">src/utils/utils.ts</span> contains various helper methods for a range of tasks,
              primarily related to getting a recipient’s public keys
            </li>
            <li>
              <span class="code">src/types.ts</span>: You’ll see a few custom types used throughout, which are all
              defined here
            </li>
          </ol>
          <p>
            After reading through the above, you should be well-equipped to understand the Umbra.sol contract, which
            you’ll notice is actually quite simple. The one new part in the contract which you won’t have seen anything
            about yet is the hooks. You can read more about this in the "What are Hooks and how do I use them?" section.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-receive-a-users-viewing-key-but-not-their-spending-key">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-receive-a-users-viewing-key-but-not-their-spending-key'"
          question="How can I receive a user’s viewing key, but not their spending key?"
        >
          <p>
            Currently, the only way to do this is request a user’s signature using
            <span class="code">Umbra.generatePrivateKeys()</span>, which will return both their spending key and their
            viewing key. It’s up to you to discard the spending key and not use it. A sample snippet to do this is
            below:
          </p>
          <div class="text-caption bg-muted q-pa-md">
            <div class="code code-grey">// Import the Umbra class</div>
            <div class="code code">
              <span class="code-blue">import </span> <span class="text-grey">{</span> Umbra
              <span class="text-grey">} </span> <span class="code-blue">from</span>
              <span class="code-green">'@umbra/umbra-js'</span>;
            </div>
            <br />
            <div class="code code-grey">// Let `signer` be an ethers JsonRpcSigner generated when the user</div>
            <div class="code code-grey">// connected their wallet. The below line will request a signature</div>
            <div class="code code-grey">// from the user, compute both their spending and viewing keys, but</div>
            <div class="code code-grey">// only return the viewing KeyPair instance to the caller.</div>
            <div class="code code">
              <span class="code-blue">const </span> <span class="text-grey">{</span> viewingKeyPair
              <span class="text-grey">}</span> = <span class="code-blue">await</span> Umbra.<span class="code-pink"
                >generatePrivateKeys</span
              >(signer);
            </div>
          </div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-hooks-and-how-do-i-use-them">
        <f-a-q-item
          :expanded="selectedId === 'what-are-hooks-and-how-do-i-use-them'"
          question="What are Hooks and how do I use them?"
        >
          <p>
            If you’re familiar with
            <a class="hyperlink" href="https://eips.ethereum.org/EIPS/eip-777" target="_blank">ERC-777</a> or other
            similar standards, you are already familiar with the concept of hooks. Hooks let the caller perform other
            actions in addition to the core logic of the method being called. In the case of ERC-777, a transfer hook
            can be used to call a method on a contract after transferring tokens to that contract.
          </p>
          <p>
            Umbra works simiarly—when withdrawing funds from the contract, users might want to deposit them straight
            into Tornado, or swap their DAI for ETH. Hooks let you do this.
          </p>
          <p>You’ll notice the Umbra contract exposes multiple withdraw methods. First we have:</p>
          <ol>
            <li><span class="code">withdrawToken()</span> for standard withdrawals, i.e. simple transfers</li>
            <li>
              <span class="code">withdrawTokenOnBehalf()</span> has the same functionality as
              <span class="code">withdrawToken()</span>, but lets a relayer submit the withdraw on your behalf to
              support meta-transactions.
            </li>
          </ol>
          <p>Then we have the two hook methods:</p>
          <ol>
            <li>
              <span class="code">withdrawTokenAndCall()</span> is analagous to
              <span class="code">withdrawToken()</span>, but lets you pass in the address of a contract and the data to
              call on that contract.
            </li>
            <li>
              <span class="code">withdrawTokenAndCallOnBehalf()</span> is analagous to
              <span class="code">withdrawTokenOnBehalf()</span>, but also lets you pass in the address of a contract and
              the data to call on that contract.
            </li>
          </ol>
          <p>
            To use hooks, first you need to write and deploy a hook contract conforming to the
            <span class="code">IUmbraHookReceiver</span> interface. This requires the contract to implement a method
            calls <span class="code">tokensWithdrawn()</span> that takes a handful of parameters. The address of this
            contract would be passed as the value for the <span class="code">_hook</span> input in the above methods.
          </p>
          <p>
            Then you need to encode the calldata that the hook contract will receive and can operate on. See the
            <a
              class="hyperlink"
              href="https://docs.ethers.io/v5/single-page/#/v5/api/utils/abi/interface/-%23-Interface--encoding"
              target="_blank"
              >Encoding Data</a
            >
            section of the ethers.js docs for info on how to encode function data.
          </p>
          <p>
            And that’s all there is to it. With the address of the hook contract and the encoded calldata, you are ready
            to call one of the two hook-based methods.
          </p>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-is-the-payload-extension-and-how-do-i-use-it">
        <f-a-q-item
          :expanded="selectedId === 'what-is-the-payload-extension-and-how-do-i-use-it'"
          question="What is the payload extension and how do I use it?"
        >
          <p>
            The Umbra contract expects a 32 byte random number to be used, but due to how elliptic curve cryptography
            works, a random number over 16 bytes provides no added security*.
          </p>
          <p>
            Therefore, we decided to use 16 byte random numbers to maximize security, and provide the other 16 bytes to
            developers to do anything they want with. These free 16 bytes of arbitrary data are what we call the payload
            extension.
          </p>
          <p>
            In the case of the Umbra app, we use this to let senders write short messages to receivers. Other use cases
            for this payload extension are only limited by your imagination!
          </p>
          <p class="text-caption text-italic">
            * The strength of elliptic curve cryptography is roughly equal to
            <a
              class="hyperlink"
              href="https://en.wikipedia.org/wiki/Elliptic-curve_cryptography#Key_sizes"
              target="_blank"
              >half the size</a
            >
            of the prime field, i.e. half the size of the private keys. Since Ethereum is based on the secp256k1 curve
            with 256 bit (32 byte) keys, it really only offers 128 bits (16 bytes) of security.
          </p>
        </f-a-q-item>
      </div>
    </q-list>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, SetupContext } from '@vue/composition-api';
import FAQItem from 'components/FAQItem.vue';
import { copyToClipboard, scroll } from 'quasar';
import { notifyUser } from 'src/utils/alerts';

function useScrollToElement(context: SetupContext) {
  const { getScrollTarget, setScrollPosition } = scroll;
  const selectedId = ref('');

  // Hepler methods
  const getElementIdFromUrl = () => context.root.$router.currentRoute.hash.slice(1); // .slice(1) to remove '#'

  const expandAndScrollToElement = (elementId: string) => {
    // Get element
    const el = document.getElementById(elementId);
    console.log(el);
    if (!el) return;
    selectedId.value = elementId;

    // Scroll to element
    const target = getScrollTarget(el);
    const offset = el.offsetTop;
    const duration = 500; // duration of scroll
    setScrollPosition(target, offset, duration);
  };

  // Copy the URL to go directly to the clicked element and update URL in navigation bar
  const copyUrl = async (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const elementId = el.id;
    const slug = context.root.$router.currentRoute.path; // includes the leading forward slash
    const page = `${slug}#${elementId}`;
    await copyToClipboard(`${window.location.origin}${page}`);
    if (el.getAttribute('isHeader')) notifyUser('positive', 'URL successfully copied to clipboard');
    window.history.pushState('', '', page); // updates URL in navigation bar
  };

  // Scrolls to element, and when applicable clicks the expansion item to open it
  onMounted(() => expandAndScrollToElement(getElementIdFromUrl()));

  return { selectedId, expandAndScrollToElement, copyUrl };
}

export default defineComponent({
  name: 'PageFAQ',
  components: { FAQItem },
  setup(_props, context) {
    return { ...useScrollToElement(context) };
  },
});
</script>

<style lang="sass" scoped>
.link-icon-parent:hover .link-icon
  color: $primary

.link-icon
  color: transparent
</style>

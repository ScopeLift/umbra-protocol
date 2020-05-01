# Umbra

Send and receive stealth payments

## Development

1. Run `npm install`
2. Run `node poc.js` to run the proof-of-concept file. If successful, you should see logs similar to the ones below in your console. Note that the two checks under step 6 are the most important, and both should be `true` if the script ran successfully

```text
Step 1: Public key successfully recovered from recipient signature
Step 2: N/A
Step 3: 32-byte random number successfully generated
Step 4: N/A
Step 5: Sender computed receiving address of  0x898dc9f96835df5c8190e6de390694f79c79dd5a
Step 6: Checking that receiver computed same receiving address:
  Check 1:  true
  Check 2:  true

Complete! Outputs are below
  Stealth address:       0x898dc9f96835df5c8190e6de390694f79c79dd5a
  Stealth public key:    311a17971fedf86325e057590ae1c8adc7219f8889fe49e1e9e8ca13b41daeba9ab0f9ad59ce19c23c24d86186eecc187f24422ba1d9bb897228ceac76fafef7
  Stealth private key:   0xa792d048656686422d22462e0fc76e74f7d24a014368270ddfdb972830aaa271
```

## How it Works

For an introduction and background on elliptic curve cryptography, see the references below:

- [A (Relatively Easy To Understand) Primer on Elliptic Curve Cryptography](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/)
- [Elliptic Curve Cryptography: a gentle introduction - Andrea Corbellini](https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/) (This is part one of four part series. All four parts are recommended)

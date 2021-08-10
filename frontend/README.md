# Umbra Frontend

A first party frontend for interacting with the Umbra protocol. The frontend is built with [Quasar](https://quasar.dev/), [Typescript](https://www.typescriptlang.org/), [ethers](https://docs.ethers.io/v5/), and a number of other technologies. It relies on [umbra-js](../umbra-js) for interacting with Umbra itself.

## Development

Copy the `.env.example` to `.env` and populate it with your own configuration parameters.

```bash
cp .env.example .env
```

The required parameters are:

`INFURA_ID` - A valid Infura App Identifier <br />
`BLOCKNATIVE_API_KEY` - A Blocknative API key

Optional parameters are:

`FORTMATIC_API_KEY` - API key needed if using Fortmatic <br />
`PORTIS_API_KEY` - API key needed if using Portis

Install dependencies and run the app in development mode using `yarn`.

```bash
yarn
yarn dev
```

Other commands are also available via `yarn`:

```bash
yarn lint # lint the codebase
yarn prettier # apply formatting rules to the codebase
yarn build # build a static version of the site for deployment
yarn clean # clear previous build artifacts
```

1. Create a file called `.env` and populate it with the contents of `.env.template`
2. Fill in the `.env` file with your Infura ID. You only need the Portis and Fortmatic API keys if you plan on using those wallets
3. Install dependencies with `yarn`
4. Build for development with `yarn run dev`

# Umbra Frontend

A first-party frontend for interacting with the Umbra protocol. The frontend is built with [Quasar](https://quasar.dev/), [TypeScript](https://www.typescriptlang.org/), [ethers](https://docs.ethers.org/v5/), and a number of other technologies. It relies on [umbra-js](../umbra-js) for interacting with Umbra itself.

## Development

Copy the `.env.example` to `.env` and populate it with your own configuration parameters.

```bash
cp .env.example .env
```

The required parameters are:

`MAINNET_RPC_URL` - Network RPC URLs <br />
`POLYGON_RPC_URL` <br />
`OPTIMISM_RPC_URL` <br />
`ARBITRUM_ONE_RPC_URL` <br />
`SEPOLIA_RPC_URL` <br />
`BASE_RPC_URL` <br />
`PONDER_SUBGRAPH_URL` - Preferred Ponder GraphQL endpoint used for receive scans. On Netlify, use the same-origin proxy path `/api/ponder`; this value is public and bundled into the frontend.

Optional parameters are:

`WALLET_CONNECT_PROJECT_ID` - WalletConnect project ID, needed to connect wallets through WalletConnect <br />
`*_SUBGRAPH_URL` - Legacy per-chain subgraph URLs used when `PONDER_SUBGRAPH_URL` is not configured <br />
`ETHERSCAN_API_KEY`, `OPTIMISTIC_ETHERSCAN_API_KEY`, `POLYGONSCAN_API_KEY`, `ARBISCAN_API_KEY` - API keys umbra-js uses to look up transaction history <br />
`LOG_LEVEL` - Log level for the app's logger, defaults to `DEBUG` <br />
`MAINTENANCE_MODE_SEND` - Set to `1` to put the Send page in maintenance mode <br />
`MAINTENANCE_MODE_GLOBAL` - Set to `1` to put the whole app in maintenance mode

Set up mise using the [root development instructions](../README.md#instructions), then install dependencies and build umbra-js from the workspace root. The root `mise.toml` selects Node.js and Yarn for all workspaces. The frontend and its lint checks rely on the umbra-js build output, so rerun `yarn build-umbra-js` after changing umbra-js:

```bash
yarn install
yarn build-umbra-js # generates contract types and builds umbra-js
```

For local frontend development with receive scanning enabled, use the project-local Netlify CLI installed by `yarn install`. Run Netlify Dev from the workspace root; the script builds umbra-js first and automatically selects the frontend workspace:

```bash
yarn dev:netlify
```

Open `http://localhost:8888`. Quasar also runs on `http://localhost:8080`, but that direct URL bypasses the Netlify Function proxy and should not be used to test receive scans. Run `yarn netlify login` and `yarn netlify link --filter @umbra/frontend` to link the checkout to the Umbra app/frontend site if you want Netlify Dev to pull hosted site environment variables; local workspace root `.env` values also work.

The local scan-capable setup uses two env files:

```text
# frontend/.env
PONDER_SUBGRAPH_URL=/api/ponder
```

```text
# ../.env
PONDER_UPSTREAM_URL=https://your-ponder-service.onrender.com/graphql
PONDER_API_TOKEN=your-secret-token
```

`PONDER_SUBGRAPH_URL` is public and bundled into the frontend. `PONDER_UPSTREAM_URL` and `PONDER_API_TOKEN` are private Function runtime values, so keep them out of `frontend/.env`.

Netlify CLI may create a root `deno.lock` while bootstrapping its Edge Functions environment. This app does not define Edge Functions, so that generated file is ignored.

For frontend-only development that does not require the Netlify Function proxy, `yarn dev` still runs Quasar directly.

Other commands are also available via `yarn` from this package:

```bash
yarn lint # lint the codebase
yarn prettier # apply formatting rules to the codebase
yarn test # run the unit tests
yarn build # build a static version of the site for deployment
yarn clean # clear previous build artifacts
```

Receive scans prefer `PONDER_SUBGRAPH_URL` and fall back to the legacy per-chain `*_SUBGRAPH_URL` values while Ponder is being configured everywhere. `yarn build` fails unless `PONDER_SUBGRAPH_URL` is set or `OPTIMISM_SUBGRAPH_URL`, `POLYGON_SUBGRAPH_URL`, and `BASE_SUBGRAPH_URL` are all set, since receive scans on those chains cannot fall back to RPC logs.

For a Netlify deployment, build the frontend with `PONDER_SUBGRAPH_URL=/api/ponder`. The Netlify Function at that path forwards GraphQL requests to Ponder and adds the API key server-side. Configure these variables in the Netlify UI, CLI, or API so they are available to Functions at runtime:

```text
PONDER_UPSTREAM_URL=https://your-ponder-service.onrender.com/graphql
PONDER_API_TOKEN=your-secret-token
```

Do not add either runtime variable to `frontend/.env`, the frontend build environment, or `netlify.toml`: values used by the static frontend are compiled into browser assets. Configure the same `PONDER_API_TOKEN` on the Render Ponder service. The proxy accepts JSON GraphQL `POST` requests up to 64 KiB, times out upstream calls after 15 seconds, and uses Netlify's built-in per-domain-and-IP limit of 300 requests per minute.

To verify a deployed preview or production build has a working Ponder configuration, run the smoke test against its URL. The build stamps `PONDER_SUBGRAPH_URL` into an `umbra:ponder-subgraph-url` meta tag in `index.html`; the smoke test reads it (and checks it matches `PONDER_SUBGRAPH_URL` if set in your shell), verifies the path is inlined in the deployed JS bundles, resolves it against the deployment URL, and runs a basic Ponder announcements scan through the proxy:

```bash
PONDER_SUBGRAPH_URL=/api/ponder yarn smoke-test:ponder https://deploy-preview-123--umbra.netlify.app
```

## Internationalization

### Usage

The app is currently available in English and Simplified Chinese. It uses [Vue I18n](https://vue-i18n.intlify.dev/) v9, set up as described in [Quasar's internationalization guide](https://quasar.dev/options/app-internationalization). Translations live in `src/i18n/locales/<locale>.json`.

Basic usage is as follows:

1. In each `src/i18n/locales/<locale>.json` file, add a new key and the corresponding text or translation, like so:
   `"key-name": "Sample text"`
2. Use the following templates to embed the message in the frontend:
   - Inside templates: `{{ $t('key-name') }}`
   - Inside attributes: `:label="$t('key-name')"`
   - Inside `<script>` blocks and `.ts` files: `import { tc } from 'src/boot/i18n';` and use `tc('key-name')`

`yarn lint:i18n`, which runs as part of `yarn lint`, reports missing and unused translation keys.

While embedding longer texts with styles and links inside the template section of Vue components, there are a few options:

1. **For texts with HTML tags and styles:**
   Use an [HTML message](https://vue-i18n.intlify.dev/guide/essentials/syntax#html-message). E.g.,

   - Store the key value pair like so, adding `\` in front of `"` to escape quotes:
     `"key-with-html-tags": "<p>New paragraph with <span class=\"text-bold\">bold</span> text</p>"`
   - Inside templates use `v-html="$t('key-with-html-tags')"` to keep the styles and HTML tags
   - You can also use the `<i18n-t>` component as shown in option 3.

2. **For texts that contain variables:**
   Use [named interpolation](https://vue-i18n.intlify.dev/guide/essentials/syntax#named-interpolation). E.g.,

   - Store the key value pair like so: `"key-with-variables": "This is a {varName}"`
   - Inside templates use `{{ $t('key-with-variables', { varName: jsVariableName }) }}`

3. **For links or texts with HTML tags, use the `<i18n-t>` component:**
   Use [component interpolation](https://vue-i18n.intlify.dev/guide/advanced/component) with [list interpolation](https://vue-i18n.intlify.dev/guide/essentials/syntax#list-interpolation) placeholders. E.g.,

   - Store key value pairs like:
     `"return-to-home": "You may now return {0} to send or receive funds"`,
     `"return-home": "home"`
   - Links:

     ```
     <i18n-t keypath="return-to-home" tag="p" class="q-mt-md">
       <router-link class="hyperlink" :to="{ name: 'home' }">{{ $t('return-home') }}</router-link>
     </i18n-t>
     ```

   - Texts with HTML tags:

     ```
     <i18n-t keypath="return-to-home" tag="p">
       <span class="code">Text or {{ variable }}</span>
     </i18n-t>
     ```

4. **For texts with multiple links or HTML tags:**
   Use the [slots syntax](https://vue-i18n.intlify.dev/guide/advanced/component#slots-syntax-usage). E.g.,

   - Store the key value pair like: `"key-with-multiple-var": "This has multiple {links} or {vars}."`
   - Inside the template:

     ```
     <i18n-t keypath="key-with-multiple-var" tag="p">
       <template v-slot:links>
         <a class="hyperlink" href="https://app.umbra.cash" target="_blank">1</a>
       </template>
       <template v-slot:vars>
         <span class="code">Text or {{ variable }}</span>
       </template>
     </i18n-t>
     ```

### Adding a new language

If you want to add a new language, e.g. French, you need to:

1. Create a new JSON file in `src/i18n/locales/` and name it with the language's [BCP 47 language tag](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag), e.g. `fr-FR.json`, to match the existing `en-US.json` and `zh-CN.json`.
2. Copy the contents of `en-US.json` to the new file and translate the values into the new language.
3. Import the JSON file in `src/i18n/index.ts` and add it to the exported messages under its language tag.
4. Add the language name and language tag to `supportedLanguages` in `src/store/settings.ts`.

To preview a language, open the app with the `locale` URL parameter, e.g. `http://localhost:8888/?locale=zh-CN`.

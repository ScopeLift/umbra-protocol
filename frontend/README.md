# Umbra Frontend

A first party frontend for interacting with the Umbra protocol. The frontend is built with [Quasar](https://quasar.dev/), [Typescript](https://www.typescriptlang.org/), [ethers](https://docs.ethers.io/v5/), and a number of other technologies. It relies on [umbra-js](../umbra-js) for interacting with Umbra itself.

## Development

Copy the `.env.example` to `.env` and populate it with your own configuration parameters.

```bash
cp .env.example .env
```

The required parameters are:

`BLOCKNATIVE_API_KEY` - A Blocknative API key <br />
`MAINNET_RPC_URL` - Network RPC URLs <br />
`POLYGON_RPC_URL` <br />
`OPTIMISM_RPC_URL` <br />
`ARBITRUM_ONE_RPC_URL` <br />
`SEPOLIA_RPC_URL` <br />
`BASE_RPC_URL` <br />
`PONDER_SUBGRAPH_URL` - Preferred Ponder GraphQL endpoint used for receive scans. On Netlify, use the same-origin proxy path `/api/ponder`; this value is public and bundled into the frontend. <br />
`*_SUBGRAPH_URL` - Legacy per-chain subgraph URLs used when `PONDER_SUBGRAPH_URL` is not configured <br />

Optional parameters are:

`FORTMATIC_API_KEY` - API key needed if using Fortmatic <br />
`PORTIS_API_KEY` - API key needed if using Portis

Install dependencies from the workspace root:

```bash
yarn install
```

For local frontend development with receive scanning enabled, install the Netlify CLI and run the app through Netlify Dev from the workspace root:

```bash
npm install -g netlify-cli # one-time install if netlify is not already on your PATH
yarn dev:netlify
```

Open `http://localhost:8888`. Quasar also runs on `http://localhost:8080`, but that direct URL bypasses the Netlify Function proxy and should not be used to test receive scans. Run `netlify login` and link the checkout to the Umbra app/frontend site if you want Netlify Dev to pull hosted site environment variables; local workspace root `.env` values also work.

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

The app is currently available in English and Simplified Chinese.
For more details on the internationalization approach and usage see [Quasar I18n doc v.1.18.10](https://v1.quasar.dev/options/app-internationalization#introduction) and [Vue I18n v8.x doc for Vue2](https://kazupon.github.io/vue-i18n/introduction.html).

[Basic usage](https://v1.quasar.dev/options/app-internationalization#how-to-use) is as follows:

1. In the corresponding `/i18n/locales/<locale>.json` file add a new key and corresponding text or translation like so:
   `"key-name" : "Sample text"`
2. Use the following templates to embed the message on the frontend:

- Inside templates: `{{ $t('key-name') }}`
- Inside attributes: `:label="$t('key-name')"`
- Inside scripts, import `getCurrentInstance()` from `'vue'` and create an instance inside a function using `const vm = getCurrentInstance()!;` then use `vm.$i18n.tc('AccountReceiveTable.date-received')`
- Inside `.ts` files, `import { tc } from "../boot/i18n";` and use `tc('key-name')`.

While embedding longer texts with styles and links inside template section of Vue components, there are a few options:

1. **For texts with html tags and styles:**
   Use `Vue-i18n`'s [HTML formatting](https://kazupon.github.io/vue-i18n/guide/formatting.html#html-formatting) style. E.g.,

- Store json file key value pairs like so, adding `\` in front of `"` to escape quotes:
  `"key-with-html-tags": "<p>New paragraph with<span class=\"text-bold\">bold</span> text</p>"`
- Inside templates use `v-html="$t('key-name')` to maintain style and html tags
- You can also use `<i18n>` tags as shown in step 3.

2. **For texts that contain variables:**
   Use [named formatting](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) style. E.g.,

- Key pairs stored as : `"key-with-variables": "This is a %{varName}"`
- Inside templates use, `{{ $t('key-with-variables'), { varName: JSVariableName }) }}`

3. **For links or texts with html tags use `<i18n>` tags:**
   Use [component interpolation](https://kazupon.github.io/vue-i18n/guide/interpolation.html#basic-usage) following `Vue-i18n`'s [list formatting](https://kazupon.github.io/vue-i18n/guide/formatting.html#list-formatting) style. E.g.,

- Store key pairs like:
  `"return-to-home": "You may now return {0} to send or receive funds"`,
  `"return-home": "home"`
- Links:

```
<i18n path="return-to-home" tag="p" class="q-mt-md">
  <router-link class="hyperlink" :to="{ name: 'home' }">{{$t('return-home')}}</router-link>
</i18n>
```

- Texts with html tags:

```
<i18n path="return-to-home" tag="p">
  <span class="code">Text or {{ Variable }}</span>
</i18n>
```

4. **Texts with multiple links or html tags:**
   Use [slot syntax](https://kazupon.github.io/vue-i18n/guide/interpolation.html#slots-syntax-usage). E.g.,

- Stored key pairs like:
  `"key-with-multiple-var": "This has multiple {{links}} or {{vars}}."`
- Inside the template:

```
<i18n path="key-with-multiple-var" tag="p">

  <template v-slot:links>
    <a class="hyperlink" href="https://app.umbra.cash" target="_blank" >1</a >
  </template>

  <template v-slot:vars>
    <span class="code">Text or {{ Variable }}</span>
  </template>

</i18n>
```

### Adding a new language

If you want to add a new langauge e.g. French, you need to:

1. Create a new json file in `/i18n/locales/` and name it according to the language code listed [here](https://www.roseindia.net/tutorials/I18N/locales-list.shtml) i.e., `fr.json`. You can also change your browser language in settings and `console.log(locale)` in the `src/boot/i18n.ts` file to see the language code.
2. Copy the contents of `en-US.json` to your newly created `<language-code>.json` file and translate key values to the corresponding language of your choice.
3. Import the `json` file into the `src/i18n/index.ts` file and export it to be used.
4. Add the language name and language code to `supportedLanguages` in `src/store/settings.ts`.

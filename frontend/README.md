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

## Internationalization

The app is currently available in English and Simplified Chinese.

Basic usauge is as follows:

1. In the corresponding /i18n/locales/`<locale>`.json file add a new key and corresponding text or translation like so:
`"key-name" : "Sample text"`
2. Use the following templates to embed the message on the frontend:
- Inside templates: `{{ $t('key-name') }}`
- Inside attributes: `:label="$t('key-name')"`
- Inside scripts, create an instance inside a function using `const vm = getCurrentInstance()!;` then use `vm.$i18n.t('AccountReceiveTable.date-received')`

While embedding longer texts with styles and links, there are a few options:

1. For texts with html tags and styles:
- Store json file key value pairs like so, adding \ in front of ":
`"key-with-html-tags": "<p>New paragraph with<span class=\"text-bold\">bold</span> text</p>"`
- Inside templates use v-html="$t('key-name')` to maintain style and html tags

2. For texts that contain variables:

- Key pairs stored as : `"key-with-variables": "This is a %{varName}"`
- Inside templates use, `{{ $t('key-with-variables'), { varName: JSVariableName }) }}`

3. For links or another way for texts with html tags using `<i18n>` tags:
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

4. Texts with multiple links or html tags:
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
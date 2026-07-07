declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    PONDER_SUBGRAPH_URL: string | undefined;
    MAINNET_SUBGRAPH_URL: string | undefined;
    OPTIMISM_SUBGRAPH_URL: string | undefined;
    POLYGON_SUBGRAPH_URL: string | undefined;
    BASE_SUBGRAPH_URL: string | undefined;
    ARBITRUM_ONE_SUBGRAPH_URL: string | undefined;
    SEPOLIA_SUBGRAPH_URL: string | undefined;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

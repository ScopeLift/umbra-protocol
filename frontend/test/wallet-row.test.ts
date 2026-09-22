/**
 * @jest-environment jsdom
 */
import { mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import WalletRow from 'src/components/WalletRow.vue';
import { copyAddress } from 'src/utils/utils';

jest.mock('src/utils/utils', () => ({
  copyAddress: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('src/store/wallet', () => () => ({
  provider: shallowRef(provider),
  currentChain: ref({ blockExplorerUrls: ['https://etherscan.io'] }),
  connectedWalletLabel: ref('Test wallet'),
  disconnectWallet: jest.fn(),
}));

jest.mock('src/store/settings', () => () => ({
  isDark: ref(false),
}));

const provider = {};
const userAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';

describe('WalletRow', () => {
  it('passes the full connected address and provider to copyAddress when clicked', async () => {
    const wrapper = mount(WalletRow, {
      props: {
        userAddress,
        userDisplayName: 'alice.eth',
        display: true,
        setDisplayWalletRow: jest.fn(),
        advancedMode: false,
        avatar: null,
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs: { BaseButton: true, QIcon: true, RouterLink: true },
      },
    });

    try {
      await wrapper.get('.copy-icon-parent').trigger('click');

      expect(copyAddress).toHaveBeenCalledTimes(1);
      expect(copyAddress).toHaveBeenCalledWith(userAddress, provider);
    } finally {
      wrapper.unmount();
    }
  });
});

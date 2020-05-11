/**
 * @notice This mixin contains generic helper functions
 */
import ethers from 'ethers';
import { Notify } from 'quasar';


export default {
  data() {
    return {};
  },

  methods: {
    /**
     * @notice Returns the transaction hash of the first transaction sent by this address, or
     * undefined if none was found
     * @param {String} address address to lookup
     */
    async getSentTransaction(address) {
      const provider = new ethers.providers.EtherscanProvider('ropsten');
      const history = await provider.getHistory(address);
      let txHash;
      for (let i = 0; i < history.length; i += 1) {
        const tx = history[i];
        if (tx.from === address) {
          txHash = tx.hash;
          break;
        }
      }
      return txHash;
    },

    /**
     * Present notification alert to the user
     * @param {string} color alert color, choose positive, negative, warning, info, or others
     * @param {string} message message to display on notification
     */
    notifyUser(color, message) {
      Notify.create({
        color,
        message,
        // If positive, timeout after 5 seconds. Otherwise, show until dismissed by user
        timeout: color.toLowerCase() === 'positive' ? 5000 : 0,
        position: 'top',
        actions: [{ label: 'Dismiss', color: 'white' }],
      });
    },

    /**
     * Show error message to user
     * @param {Any} err Error object thrown
     * @param {Any} msg Optional, fallback error message if one is not provided by the err object
     */
    showError(err, msg = 'An unknown error occurred') {
      console.error(err); // eslint-disable-line no-console
      if (!err) this.notifyUser('negative', msg);
      else if (err.isAxiosError && err.response.data.error) this.notifyUser('negative', err.response.data.error);
      else if (err.message) this.notifyUser('negative', err.message);
      else if (err.msg) this.notifyUser('negative', err.msg);
      else if (typeof err === 'string') this.notifyUser('negative', err);
      else this.notifyUser('negative', msg);
    },
  },
};

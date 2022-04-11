# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env
forkBlock = 10465092

all:; clean install test
# Clean the repo
clean  :; forge clean
# Install the Modules
install :; forge install
# Test your contract on a forked network
test   :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock}
## Create gas snapshots
snapshot   :; forge snapshot -f ${ETH_RPC_URL} --fork-block-number ${forkBlock}
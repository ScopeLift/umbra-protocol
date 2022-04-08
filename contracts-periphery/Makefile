# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

all:; clean install test

# Clean the repo
clean  :; forge clean
# Install the Modules
install :; forge install
# Test your contract on a forked network
test   :; forge test -f ${ETH_RPC_URL} --fork-block-number 10465092


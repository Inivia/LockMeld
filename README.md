## Prerequisites

LockMeld can be deployed and tested using [Truffle](https://www.trufflesuite.com/truffle) and [Ganache](https://github.com/trufflesuite/ganache).

### Required utilities

- Node.js, tested with version v16.15.0.
- Yarn, tested with version v1.22.18.

Run the following commands:

```bash
npm install -g yarn
npm install -g truffle
npm install -g ganache
```

In the main directory, type `yarn` to install all dependencies.

## Running Tests
first run in terminal to start virtual chains
```bash
ganache --port=8545 --detach
ganache --port=7545 --detach
```
then run Client.js

after test, run
```bash
ganache instances stop
```
to stop all
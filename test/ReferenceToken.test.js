/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const Web3 = require('web3');
const EIP820Registry = require('eip820');
const ReferenceToken = artifacts.require('ReferenceToken');
const utils = require('./utils');

contract('ReferenceToken', function(accounts) {
  const web3 = new Web3('ws://127.0.0.1:8545');

  let token = {
    name: 'ReferenceToken',
    symbol: 'XRT',
    granularity: '0.01',
    totalSupply: '0',
    defaultBalance: '0',
  };

  after(async function() { await web3.currentProvider.connection.close(); });

  beforeEach(async function() {
    let erc820Registry = await EIP820Registry.deploy(web3, accounts[0]);
    assert.ok(erc820Registry.$address);
    let truffleToken = await ReferenceToken.new(
      token.name,
      token.symbol,
      web3.utils.toWei(token.granularity),
      { from: accounts[0], gasPrice: 100000000000, gasLimit: 800000 }
    );
    // Use Web3.js 1.0
    token.contract = new web3.eth
      .Contract(truffleToken.abi, truffleToken.address);

    token.disableERC20 = async function() {
      await token.contract.methods
        .disableERC20()
        .send({ gas: 300000, from: accounts[0] });
    };

    token.genMintTxForAccount = function(account, amount, operator, gas) {
      return token.contract.methods
        .mint(account, web3.utils.toWei(amount), '0xcafe')
        .send.request({ gas: gas, from: operator });
    };
  });

  require('./utils/attributes').test(web3, accounts, token);
  require('./utils/mint').test(web3, accounts, token);
  require('./utils/burn').test(web3, accounts, token);
  require('./utils/send').test(web3, accounts, token);
  require('./utils/operator').test(web3, accounts, token);
  require('./utils/tokenSender').test(web3, accounts, token);
  require('./utils/tokenReceiver').test(web3, accounts, token);
  require('./utils/erc20Compatibility').test(web3, accounts, token);

  describe('ERC20 Disable', function() {
    it('should disable ERC20 compatibility', async function() {
      let erc820Registry = utils.getERC820Registry(web3);
      let erc20Hash = web3.utils.keccak256('ERC20Token');
      let erc20Addr = await erc820Registry.methods
        .getInterfaceImplementer(token.contract.options.address, erc20Hash)
        .call();

      assert.strictEqual(erc20Addr, token.contract.options.address);

      await token.disableERC20();

      await utils.getBlock(web3);
      erc20Addr = await erc820Registry.methods
        .getInterfaceImplementer(token.contract.options.address, erc20Hash)
        .call();

      assert.strictEqual(
        erc20Addr, '0x0000000000000000000000000000000000000000');
    });
  });

  require('./utils/erc20Disabled').test(web3, accounts, token);
});
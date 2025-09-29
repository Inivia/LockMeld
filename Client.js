let Web3 = require('web3')
let bn = require('bignumber.js')
const { BlockList } = require('net')
var fs = require('fs')

Chain_1 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));
//Chain_2 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));
//testTX(Chain_1, Chain_2);

testDeploy(Chain_1);

async function generateTX(web3,addr1,addr2) {
    const info = await web3.eth.net.getId();
    console.log("Chain ID: "+ info);
    var result = await web3.eth.getAccounts();
    //console.log(result);
    var tx = await web3.eth.sendTransaction(
    {
        from: result[addr1],
        to: result[addr2],
        value: Chain_1.utils.toWei('1','ether')
    })
    var s_bal = await web3.eth.getBalance(result[addr1]);
    var r_bal = await web3.eth.getBalance(result[addr2]);
    console.log ("txHash:"+tx.transactionHash);
    console.log ("Sender:"+addr1+"  Balance:"+s_bal);
    console.log ("Receiver:"+addr2+"  Balance:"+r_bal);
}


async function testDeploy(web3) {
    var addr = await web3.eth.getAccounts();
    var storageContract = await new web3.eth.Contract([{"inputs":[],"name":"retrieve","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"num","type":"uint256"}],"name":"store","outputs":[],"stateMutability":"nonpayable","type":"function"}]);
    var storage = await storageContract.deploy({
     data: '0x608060405234801561001057600080fd5b5061012f806100206000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c80632e64cec11460375780636057361d146051575b600080fd5b603d6069565b6040516048919060c2565b60405180910390f35b6067600480360381019060639190608f565b6072565b005b60008054905090565b8060008190555050565b60008135905060898160e5565b92915050565b60006020828403121560a057600080fd5b600060ac84828501607c565b91505092915050565b60bc8160db565b82525050565b600060208201905060d5600083018460b5565b92915050565b6000819050919050565b60ec8160db565b811460f657600080fd5b5056fea2646970667358221220c1828bc7416fb20370fdb6a398ba6251a2748ac3027e87beed55dc160d63946564736f6c63430008000033', 
     arguments: [
     ]
}).send({
     from: addr[2], 
     gas: '4700000'
   }, function (error, result){console.log(result);})
   console.log(storageContract.options.address);
}


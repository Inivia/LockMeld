let Web3 = require('web3')
let bn = require('bignumber.js');
const { BlockList } = require('net');
var fs = require('fs')

web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));
//BlockChain_2 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));

//BlockChain_1.eth.getNodeInfo().then(console.log);//返回网络信息
//BlockChain_1.eth.net.isListening().then(console.log);//返回网络是否连接
//BlockChain_1.eth.net.getId().then(console.log);//获取网络id


// var batch = new BlockChain_1.BatchRequest();
// batch.add(BlockChain_1.eth.getBalance.request('0x7C8D7DCDf4d22Ec5c7f3bBdDAd4A6928AF43C80d', 'latest', function(error,result){
//     console.log(error);
//     console.log(result);
// }));

// batch.add(contract.methods.retrieve().call.request({from:'0x7C8D7DCDf4d22Ec5c7f3bBdDAd4A6928AF43C80d'},function(error,result){
//     console.log(error);
//     console.log(result);
// }));
//batch.execute();
//显示全部账户
//BlockChain_1.eth.getAccounts(console.log);
//BlockChain_1.eth.personal.newAccount('1234').then(console.log);//0xbA9847B9aDAAdF6C0b4F458DB67C9D5D8551047b
//显示余额
// BlockChain_1.eth.getGasPrice().then((result) => {
//     console.log("wei:" +result);
//     console.log("ETH:" + BlockChain_1.utils.fromWei(result,'ether'));
// });
//发送交易
//查看交易
//BlockChain_1.eth.getTransaction('0x3042bde3fb3d8a6a9788081d42deaf6b79496814288f008965af190c2602916f',console.log);
//交易哈希transactionHash
//交易编号transactionIndex
//块号blockNumber
//累计消耗cumulativeGasUsed
//本次消耗gasUsed
//contractAddress
// var tx = {
//     from: '0x2255D9b275C955517BdeC186F5EEaB38f8E4854C',
//     to: '0x4F7C83FEe1F6bCDc870A1f8f8042D2FbBBfB4AB9',
//     value: BlockChain_1.utils.toWei('1','ether'),
//     data:'123'
// };
// BlockChain_1.eth.sendTransaction(tx).then(console.log);
//部署合约
var demosimpleContract = new web3.eth.Contract([{"inputs":[],"name":"getNumber","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_number","type":"uint256"}],"name":"setNumber","outputs":[],"stateMutability":"nonpayable","type":"function"}]);
var demosimple = demosimpleContract.deploy({
     data: '0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80633fb5c1cb146034578063f2c9ecd814604c575b5f5ffd5b604a60048036038101906046919060a9565b6066565b005b6052606f565b604051605d919060dc565b60405180910390f35b805f8190555050565b5f5f54905090565b5f5ffd5b5f819050919050565b608b81607b565b81146094575f5ffd5b50565b5f8135905060a3816084565b92915050565b5f6020828403121560bb5760ba6077565b5b5f60c6848285016097565b91505092915050565b60d681607b565b82525050565b5f60208201905060ed5f83018460cf565b9291505056fea26469706673582212201afa0f8697e5a43e2d5e04b2a2068945289642f778fce06cac929befaf6aaf8264736f6c634300081e0033', 
     arguments: [
     ]
}).send({
     from: web3.eth.accounts[0], 
     gas: '4700000'
   }, function (e, contract){
    console.log(e, contract);
    if (typeof contract.address !== 'undefined') {
         console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
    }
 })
// myContract.deploy(
//     {data: data}
// ).send({
//     from:'0x6991bA53E6D7b749968caA737cad52f7aC766FAe',
//     gas: 1500000,
//     gasPrice: '1000000'
// },function(error,result){console.log(result)});
//管理与链上的交互
import Web3 from 'web3';
import BN from 'bn.js';
import primitives from "./primitives.js";
const { randomExponent, 
  randomGroupElement, 
  AdaptorPreSig, 
  AdaptorPreVf,
  Adapt,
  ExtractFromSig,
  ecdsaVf,
  ChainKeyGen,
} =primitives;
const ABI = "10";
const ctrData = "0x12345";
const Chain1 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545"));
//const Chain2 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

getAccount(Chain1, 2);

//创建web3账户，返回公(pk)私钥(private key)和地址(address)， n为参与用户数量
async function getAccount(web3, n) {
    var result = [];
    for (var i=0; i<n; i++) {
        const key= ChainKeyGen();
        const sk = key.sk.toString("hex");
        var acc = web3.eth.accounts.privateKeyToAccount(sk);
        //console.log(key);
        acc.pk = key.pk;
        result.push(acc);
    }
    console.log(result);
    return result;
}
//部署所需的合约上链并返回合约实例
async function deployContract(web3, addr){
        var json = []; 
        var contract = new web3.eth.Contract(json);
        const ctrDeploy = await contract.deploy({
            data:ctrData,
            arguments:[]
        }).send({
            from: addr,
            gas: 1500000,
            gasPrice: '30000000000000'
        });
        return contract;
}

export default {
    getAccount,
};
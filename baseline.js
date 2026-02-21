//这个部分是生成并签名两份交易发布上链的baseline实验
import chainOp from "./chainOperate.js"
import BN from 'bn.js';
const {
    deployPCCT,
    getAccount,
    initialBal,
    checkBal,
    ctx
} = chainOp;
import primitives from "./primitives.js";
const {
ecdsaSig,
ecdsaVf,
}=primitives;
import rsorc from "./rsorc.js";
const {
    ZERO,order,
    RandomEx,
    RandomG1Point,
    commit,
    rsorcKeyGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
    BASE2,
} = rsorc;
import seri from "./serialize.js";
const {
  serializeG1Point,
  ctxHash,
}=seri;
import Web3 from 'web3';
const providerOptions = {
    keepAlive: true,
    timeout: 30000, // 30秒超时
    headers: [{ name: 'Connection', value: 'keep-alive' }]
};
const Chain1 = new Web3(new Web3.providers.WebsocketProvider("ws://127.0.0.1:8545",providerOptions));
const Chain2 = new Web3(new Web3.providers.WebsocketProvider("ws://127.0.0.1:7545",providerOptions));
class chainData{
    constructor(web3){
        this.web3= web3;
        this.gasUsed =0;
    }
    async setUp() {
        this.accList = await getAccount(this.web3); //构造账户
        const tmp = await deployPCCT(this.web3, this.accList[8].address);
        this.contract = tmp.ctr //部署合约
        this.gasUsed+=tmp.gas;
        const inigas= await initialBal(this.web3, this.accList, this.contract);//初始化账户金额
        this.gasUsed+=inigas;
    }
};
async function cleanup(B1, B2) {
    //console.log('Cleaning up resources...');
    
    // 关闭 Web3 连接
    if (B1 && B1.web3 && B1.web3.currentProvider) {
        if (B1.web3.currentProvider.disconnect) {
            B1.web3.currentProvider.disconnect();
        }
    }
    
    if (B2 && B2.web3 && B2.web3.currentProvider) {
        if (B2.web3.currentProvider.disconnect) {
            B2.web3.currentProvider.disconnect();
        }
    }
    }
async function baselineTest(){
    const B1 = new chainData(Chain1);
    const B2 = new chainData(Chain2);
    await B1.setUp();
    await B2.setUp();
    //测试交易金额10
    const com_r = RandomEx();
    const com_v = commit(BigInt(10), com_r);
    //签名与验证
    let ctxR = ctxHash(B2.accList[8].address, B2.accList[1].address, com_v);
    ctxR = new BN(ctxR,16);
    let ctxS = ctxHash(B1.accList[1].address, B1.accList[8].address, com_v);
    ctxS = new BN(ctxS,16);
    const sig1 = ecdsaSig(ctxS, B1.accList[1].key.sk);
    const sig2 = ecdsaSig(ctxR, B2.accList[8].key.sk);
    console.log(ecdsaVf(ctxS, sig1, B1.accList[1].key.pk));
    console.log(ecdsaVf(ctxR, sig2, B2.accList[8].key.pk));

    const gas = await ctx(B1.accList[1].address, 
                    B1.accList[8].address, 
                    com_v, 
                    B1.contract)
                B1.gasUsed+=gas;
  
    const gas2 = await ctx(B2.accList[8].address, 
                    B2.accList[1].address, 
                    com_v, 
                    B2.contract)
                B2.gasUsed+=gas2;

    console.log("Block1 baseline ctx:", B1.gasUsed);
    console.log("Block2 baseline ctx:", B2.gasUsed);
    await cleanup(B1,B2);
}



baselineTest();
import chainOp from "./chainOperate.js"
import BN from 'bn.js';
const {
    deployPCCT,
    getAccount,
    initialBal,
    checkBal,
    ctx
} = chainOp;
import types from './types.js';
const {QuadraticForm} = types;
import ZKProof from './ZKProof.js';
const {R1Proof, SigmaProof, 
R1Prover,
R1Verifier,
SigmaProver,
SigmaVerifier,
convertToSigma,
} = ZKProof;
import pcct from "./pcct.js";
const {
  PuzzleRequest,
  PuzzlePromise,
  PuzzleSove,
  ProcessEscrow,
  ProcessRedeem,
} = pcct;
import puzzle from "./puzzle.js";
const {
  formPuzzle,
  clKeyGen,
  clEnk,
  clDec,
  clRand,
  cldRandm,
} = puzzle;
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

const testNum = 2;

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

class protocalData{
    constructor(num) {
        this.num = num;//参与账户为8*num
        this.B1 = new chainData(Chain1);
        this.B2 = new chainData(Chain2);
        this.valueRq = new Array(num*testNum);//0-7为用户，8为tumbler
        this.vsum = BigInt(0); // 记录receiver处金额总和
        this.rsum = BigInt(0); //记录sender处的随机数r总和
        this.sum_coms = ZERO;//记录sender处承诺总和
        this.valueT = 0; //rq阶段tumbler收到的总金额
        this.commits = new Array(num*testNum);//OOOM证明用承诺集
        this.PuzReq = new Array(num*testNum); //PuzReq相关参数
        this.PuzPro = new Array(num*testNum); //PuzPro相关参数
        this.PuzSov = new Array(num*testNum); //Puzsov相关参数
        this.sigmaTB = new Array(num*testNum);
        this.sigmaS = new Array(num*testNum);
    }
    //总函数
    async main() {
        await this.setUp();
         this.phaseOne();
         this.phasetwo();
        //await this.B1.web3.eth.net.isListening().then(console.log);
        await this.processOnChain();
        //输出总gas消耗

        console.log("Complete ", this.num*testNum, " pairs of cross-chain ctx.");
        console.log("Gas used on blockchainA: ", this.B1.gasUsed);
        console.log("Gas used on blockchainB: ", this.B2.gasUsed);
        //清除链接
        await this.cleanup();
        return;
    }
    //生成参数阶段
    async setUp() {
        console.log("***SetUp...");
        await this.B1.setUp();
        await this.B2.setUp();
        this.clKey = clKeyGen(); //同态加密密钥
        this.rsrcKey = rsorcKeyGen(); //随机签名密钥
        this.sumRCpt = clEnk(this.clKey.pk, this.clKey.sk); // p2 tuumbler收到的加密形式r总和
        //ooom证明密钥
        this.n = 4;
        this.m = 2;
        this.h_gens = new Array(this.n * this.m);
        for (let i = 0; i < this.h_gens.length; i++) {
            this.h_gens[i] = RandomG1Point();
        }
        this.h_gens[0] = BASE2;
        this.prover = new SigmaProver(this.h_gens,this.n,this.m);
        this.verifier = new SigmaVerifier(this.h_gens,this.n,this.m)

    }
    //执行receiver请求与tumbler回应部分
    async phaseOne() {
        console.log("***Phase1: Puzzle Request and Promise...");
        for (let j = 0;j<this.num;j++) {
            for (let i=0;i<testNum;i++) {
                //await this.B1.web3.eth.net.isListening().then(console.log);
                const ind = testNum*j+i;
                const v = BigInt(Math.floor(Math.random() * 21));
                this.vsum+=v;
                this.PuzReq[ind] = PuzzleRequest(v, this.B2.accList[8].address);
                this.PuzReq[ind].com_2 = RandomG1Point();
                const Ch2Key = this.B2.accList[8].key;
                const ctxR = ctxHash(this.B2.accList[8].address, this.B2.accList[i].address, this.PuzReq[ind].com_R);
                this.PuzReq[ind].ctxR = new BN(ctxR,16);
                this.PuzPro[ind] = PuzzlePromise (this.clKey, Ch2Key, this.rsrcKey, this.PuzReq[ind].ctxR, this.PuzReq[ind].com_R, this.PuzReq[ind].com_2);
                this.valueRq[ind] = {v:v, r:this.PuzReq[ind].r};
                this.commits[ind] = this.PuzReq[ind].com_R;
            }
        }
        //await this.B1.web3.eth.net.isListening().then(console.log);
    }
     //执行sender请求与tumbler解密部分
    async phasetwo(){
        console.log("***Phase2: Puzzle Solving and process ...");
        for ( let j = 0; j<this.num ; j++) {
            for (let i =0;i<testNum;i++){
            const ind = j*testNum+i;
            this.PuzSov[ind] =PuzzleSove(this.B1.accList[i].address,this.B1.accList[8].address,
                this.PuzPro[ind].puzzle.A1, this.PuzPro[ind].puzzle.A2, 
                this.PuzPro[ind].Rsig,this.PuzPro[ind].Asig, 
                this.PuzPro[ind].puzzle.c, 
                this.rsrcKey.pk, 
                this.B2.accList[8].key.pk, 
                this.clKey.pk,  
                this.PuzReq[ind].ctxR, 
                this.PuzReq[ind].com_R, 
                this.PuzReq[ind].com_2, 
                this.B1.accList[8].key);

                //Enc(cl_pk, r)
                const beta_BE = this.PuzSov[ind].beta;
                const r_ = beta_BE+(this.valueRq[ind].r);
                const r_BN = new BN(r_.toString(16), 16);
                this.sumRCpt = clRand(this.sumRCpt, r_BN, this.clKey.pk);//同态加Enk(r+beta)
                this.rsum = this.rsum+r_;//同态加Com(v,r+beta)
                this.sum_coms = this.sum_coms.add(this.PuzSov[ind].com_S);
                
                //OOOMproof
                let commits = [];
                const cs = this.PuzSov[ind].com_S;
                for (let k=0; k<this.commits.length; k++) {
                    commits.push(this.commits[k].negate().add(cs));
                }
                //l=ind w=bigint beta
                this.PuzSov[ind].pi =this.prover.prove(commits, ind, beta_BE);
                //const sigflag = this.verifier.verify(commits, this.PuzSov[ind].pi);
                //console.log(sigflag);
                //console.log(commit);
                 //const com0 = commit(BigInt(0),beta_BE);
                 //const com0_neg = com0.negate();
                 //console.log(commits[ind].equals(com0));//c_s-c_r = com(0,beta)
                // console.log(this.commits[ind].add(com0));//c_r+mask
                // console.log(this.PuzSov[ind].com_S);//c_s==c_r+mask
                // console.log(this.PuzSov[ind].com_S.add(com0_neg));//c_s-mask
            }
        }
        const com_t = commit(this.vsum,this.rsum);
        const equal_flag=com_t.equals(this.sum_coms);
        if (!equal_flag) {
            console.log("ERROR: not balance!");
            return;
        }
        //tumbler开始解决谜题
        for (let j = 0; j<this.num;j++) {
            for (let i =0;i<testNum;i++) {
                const ind = testNum*j+i;
                let commits = [];
                const cs = this.PuzSov[ind].com_S;
                for (let k=0; k<this.commits.length; k++) {
                    commits.push(this.commits[k].negate().add(cs));
                }
                const sigflag = this.verifier.verify(commits, this.PuzSov[ind].pi);
                //console.log(sigflag);
                if (!sigflag) {
                    console.log("ERROR: invalid OMMM proof!");
                    return;}

                this.sigmaS[ind] = ProcessEscrow(this.clKey, 
                    this.rsrcKey, 
                    this.PuzSov[ind].ctxS, 
                    this.PuzSov[ind].cRand, this.PuzSov[ind].A1Rand, this.PuzSov[ind].A2Rand, 
                    cs, 
                    this.PuzSov[ind].com_2, 
                    this.PuzSov[ind].Asig, 
                    this.PuzSov[ind].Rsig,
                    this.B1.accList[8].key.pk);

                    //流程成功，完成链上交易
                    if (!this.sigmaS[ind]) console.log("Error: cannot solve puzzle");
            }
        }
        //完成T签名
        for(let j=0;j<this.num;j++) {
            for (let i=0;i<testNum;i++) {
                const ind = testNum*j+i;
                const PR = ProcessRedeem(this.sigmaS[ind], 
                    this.PuzSov[ind].Asig, 
                    this.PuzPro[ind].Asig, this.PuzSov[ind].A1Rand,  
                    this.PuzSov[ind].beta, 
                    this.PuzReq[ind].ctxR, 
                    this.B2.accList[8].key.pk);
                this.sigmaTB[ind] = PR.sig;
            }
        }
    }
    async processOnChain(){
        //await this.B1.web3.setProvider(new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545", { timeout: 20000 }));
        //await this.B1.web3.eth.net.isListening().then(console.log);
        //await this.B2.web3.eth.net.isListening().then(console.log);
        //Chain1 dender->tumbler
        for (let j = 0; j<this.num;j++) {
            for (let i =0;i<testNum;i++) {
                //const comS = RandomG1Point();
                const ind = testNum*j+i;
                const comS = this.PuzSov[ind].com_S;
                const gas = await ctx(this.B1.accList[i].address, 
                    this.B1.accList[8].address, 
                    comS, 
                    this.B1.contract)
                this.B1.gasUsed+=gas;
                //Chain2 tumbler->receiver
                const comR = this.commits[ind];
                const gas2 = await ctx(this.B2.accList[8].address, 
                    this.B1.accList[i].address, 
                    comR, 
                    this.B2.contract)
                this.B2.gasUsed+=gas2;
            }
        }
        
    }
    async cleanup() {
    //console.log('Cleaning up resources...');
    
    // 关闭 Web3 连接
    if (this.B1 && this.B1.web3 && this.B1.web3.currentProvider) {
        if (this.B1.web3.currentProvider.disconnect) {
            this.B1.web3.currentProvider.disconnect();
        }
    }
    
    if (this.B2 && this.B2.web3 && this.B2.web3.currentProvider) {
        if (this.B2.web3.currentProvider.disconnect) {
            this.B2.web3.currentProvider.disconnect();
        }
    }
    }
};

const test = new protocalData(1);
test.main();


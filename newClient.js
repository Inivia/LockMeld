import chainOp from "./chainOperate.js"
import BN from 'bn.js';
import pLimit from 'p-limit'; // 建议使用 p-limit 控制并发
const { deployPCCT, getAccount, initialBal, checkBal, ctx } = chainOp;
import types from './types.js';
const { QuadraticForm } = types;
import ZKProof from './ZKProof.js';
const { R1Proof, SigmaProof, R1Prover, R1Verifier, SigmaProver, SigmaVerifier, convertToSigma } = ZKProof;
import pcct from "./pcct.js";
const { PuzzleRequest, PuzzlePromise, PuzzleSove, ProcessEscrow, ProcessRedeem } = pcct;
import puzzle from "./puzzle.js";
const { formPuzzle, clKeyGen, clEnk, clDec, clRand, cldRandm } = puzzle;
import rsorc from "./rsorc.js";
const { ZERO, order, RandomEx, RandomG1Point, commit, rsorcKeyGen, rsorcSign, rsorcVf, rsorcRandomize, BASE2 } = rsorc;
import seri from "./serialize.js";
const { serializeG1Point, ctxHash } = seri;
import Web3 from 'web3';

const limit = pLimit(10); // 限制并发数为10，根据节点性能调整

const Chain1 = new Web3(new Web3.providers.WebsocketProvider("ws://127.0.0.1:8545"));
const Chain2 = new Web3(new Web3.providers.WebsocketProvider("ws://127.0.0.1:7545"));

const testNum = 8;

class chainData {
    constructor(web3) { this.web3 = web3; this.gasUsed = 0; }
    async setUp() {
        this.accList = await getAccount(this.web3); //构造账户
        const tmp = await deployPCCT(this.web3, this.accList[8].address);
        this.contract = tmp.ctr //部署合约
        this.gasUsed+=tmp.gas;
        const inigas= await initialBal(this.web3, this.accList, this.contract);//初始化账户金额
        this.gasUsed+=inigas;
    }
}

class protocalData {
    constructor(num) {
        this.num = num;
        this.B1 = new chainData(Chain1);
        this.B2 = new chainData(Chain2);
        this.valueRq = new Array(num * testNum);
        this.vsum = BigInt(0);
        this.rsum = BigInt(0);
        this.sum_coms = ZERO;
        this.commits = new Array(num * testNum);
        this.PuzReq = new Array(num * testNum);
        this.PuzPro = new Array(num * testNum);
        this.PuzSov = new Array(num * testNum);
        this.sigmaTB = new Array(num * testNum);
        this.sigmaS = new Array(num * testNum);
    }

    async main() {
        await this.setUp();
        const start = performance.now();
        await this.phaseOne();
        await this.phasetwo();
        console.log(`Offline time: ${(performance.now() - start) / 1000} seconds`);
        await this.processOnChain();
        console.log("Complete ", this.num*testNum, " pairs of cross-chain ctx.");
        console.log("Gas used on blockchainA: ", this.B1.gasUsed);
        console.log("Gas used on blockchainB: ", this.B2.gasUsed);
        await this.cleanup();
        
    }

    async setUp() {
        await Promise.all([this.B1.setUp(), this.B2.setUp()]);
        this.clKey = clKeyGen();
        this.rsrcKey = rsorcKeyGen();
        this.sumRCpt = clEnk(this.clKey.pk, this.clKey.sk);
        this.prover = new SigmaProver(new Array(8).fill(BASE2), 4, 2);
        this.verifier = new SigmaVerifier(new Array(8).fill(BASE2), 4, 2);
    }

    async phaseOne() {
        await Promise.all(Array.from({ length: this.num * testNum }).map((_, ind) => limit(async () => {
            const v = BigInt(Math.floor(Math.random() * 21));
            this.vsum += v;
            const req = PuzzleRequest(v, this.B2.accList[8].address);
            req.com_2 = RandomG1Point();
            req.ctxR = new BN(ctxHash(this.B2.accList[8].address, this.B2.accList[ind % testNum].address, req.com_R), 16);
            this.PuzReq[ind] = req;
            const start = performance.now();
            this.PuzPro[ind] = PuzzlePromise(this.clKey, this.B2.accList[8].key, this.rsrcKey, req.ctxR, req.com_R, req.com_2);
            this.valueRq[ind] = { v, r: req.r };
            this.commits[ind] = req.com_R;
            console.log(`PuzzlePromise time: ${(performance.now() - start) / 1000} seconds`);
        })));
    }

    async phasetwo() {
    //console.log("***Phase2: Puzzle Solving and process ...");

    // 并行处理：谜题求解、同态加法、OOOM 证明生成
    await Promise.all(this.PuzReq.map((_, ind) => limit(async () => {
        const i = ind % testNum;
        
        // 谜题求解
        const start = performance.now();
        this.PuzSov[ind] = PuzzleSove(
            this.B1.accList[i].address, 
            this.B1.accList[8].address,
            this.PuzPro[ind].puzzle.A1, 
            this.PuzPro[ind].puzzle.A2, 
            this.PuzPro[ind].Rsig, 
            this.PuzPro[ind].Asig,
            this.PuzPro[ind].puzzle.c, 
            this.rsrcKey.pk, 
            this.B2.accList[8].key.pk, 
            this.clKey.pk,
            this.PuzReq[ind].ctxR, 
            this.PuzReq[ind].com_R, 
            this.PuzReq[ind].com_2, 
            this.B1.accList[8].key
        );

        // 同态计算：累加加密值 (r + beta)
        const beta_BE = this.PuzSov[ind].beta;
        const r_ = beta_BE + (this.valueRq[ind].r);
        const r_BN = new BN(r_.toString(16), 16);
        
        // 注意：这里需要确保操作是原子的或使用线程安全的累加方式
        this.sumRCpt = clRand(this.sumRCpt, r_BN, this.clKey.pk);
        this.rsum += r_;
        this.sum_coms = this.sum_coms.add(this.PuzSov[ind].com_S);

        // 生成 OOOM 证明
        const cs = this.PuzSov[ind].com_S;
        let commits = this.commits.map(c => c.negate().add(cs));
        this.PuzSov[ind].pi = this.prover.prove(commits, ind, beta_BE);
        console.log(`PuzzleSovReq time: ${(performance.now() - start) / 1000} seconds`);
    })));

    // 2. 余额平衡性验证
    const com_t = commit(this.vsum, this.rsum);
    if (!com_t.equals(this.sum_coms)) {
        throw new Error("ERROR: not balance!");
    }

    // 3. 并行处理：验证证明、执行 Escrow 和 Redeem
    await Promise.all(this.PuzReq.map((_, ind) => limit(async () => {
        const cs = this.PuzSov[ind].com_S;
        let commits = this.commits.map(c => c.negate().add(cs));

        // 验证 OOOM 证明
        if (!this.verifier.verify(commits, this.PuzSov[ind].pi)) {
            throw new Error(`ERROR: invalid OMMM proof at index ${ind}`);
        }

        // 执行 Escrow 流程
        this.sigmaS[ind] = ProcessEscrow(
            this.clKey, this.rsrcKey, this.PuzSov[ind].ctxS, 
            this.PuzSov[ind].cRand, this.PuzSov[ind].A1Rand, this.PuzSov[ind].A2Rand, 
            cs, this.PuzSov[ind].com_2, this.PuzSov[ind].Asig, 
            this.PuzSov[ind].Rsig, this.B1.accList[8].key.pk
        );

        if (!this.sigmaS[ind]) {
            throw new Error(`Error: cannot solve puzzle at index ${ind}`);
        }

        // 执行 Redeem 流程
        const PR = ProcessRedeem(
            this.sigmaS[ind], this.PuzSov[ind].Asig, 
            this.PuzPro[ind].Asig, this.PuzSov[ind].A1Rand,  
            this.PuzSov[ind].beta, this.PuzReq[ind].ctxR, 
            this.B2.accList[8].key.pk
        );
        this.sigmaTB[ind] = PR.sig;
    })));
    
    //console.log("Phase2 completed successfully.");
}
    
    async processOnChain() {
        const ctxlimit=pLimit(1);
        const results = await Promise.all(Array.from({ length: this.num * testNum }).map((_, ind) => ctxlimit(async () => {
            const g1 = await ctx(this.B1.accList[ind % testNum].address, this.B1.accList[8].address, this.PuzSov[ind].com_S, this.B1.contract);
            const g2 = await ctx(this.B2.accList[8].address, this.B2.accList[ind % testNum].address, this.commits[ind], this.B2.contract);
            return {g1,g2};
        })));
        results.forEach(g => 
            {this.B1.gasUsed += g.g1;
            this.B2.gasUsed += g.g2;
        }); 
    }

    async cleanup() {
        this.B1.web3.currentProvider.disconnect?.();
        this.B2.web3.currentProvider.disconnect?.();
    }
}
const test = new protocalData(1);
test.main();

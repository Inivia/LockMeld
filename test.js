import BN from 'bn.js';
import { randomBytes } from '@noble/curves/utils.js';
import params from "./params.js";
const { f, h, g, q, p, zero, curve} = params;
import primitives from "./primitives.js";
const { randomExponent, 
  randomGroupElement, 
  AdaptorPreSig, 
  AdaptorPreVf,
  Adapt,
  ExtractFromSig,
  ecdsaVf,
  ecdsaSig,
  ChainKeyGen,
} =primitives;
import seri from "./serialize.js";
const {
  serializeG1Point,
  representate,
  ctxHash
}=seri;
import rsorc from "./rsorc.js";
const {
    RandomEx,
    RandomG1Point,
    commit,
    rsorcKeyGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
    BASE2,G1,
} = rsorc;
import types from './types.js';
const {QuadraticForm} = types;
import puzzle from "./puzzle.js";
const {
  formPuzzle,
  clKeyGen,
  clEnk,
  clDec,
  clRand,
  cldRandm,
} = puzzle;
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

//const { SigmaProver } = require("./prover");
//const { SigmaVerifier } = require("./verifier");
import crypto  from "crypto";


//对primitives进行测试
testPrimitives()

//计算数据大小
function roughSizeOf(obj) {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
}

function testPrimitives() {
  //_test_commit();//测试承诺
  //_test_AdaptorSig();//测试AdaptorSig
  //_test_RSoRC();//测试可随机化承诺的可随机化签名
  //_test_QF();//测试二次型运算
  _test_cl();//测试cl加密
 // _test_cl_2() 
  //_test_Puzzle();//测试谜题管理
  //_test_ZKProof();
  //_test_PCCT();//测试链下流程整合
  //_test_commit2();

    
}
function _test_commit2(){
    const x = RandomG1Point();
    const x2 = x.multiply(BigInt(2));
    console.log(x2);
}
function _test_commit() {
    const m1 = RandomEx();                            
    const r1 = RandomEx();
    const m2 = RandomEx();                            
    const r2 = RandomEx();      
    var res = commit(m1,r1); 
    var res2 = commit(m2,r2);
    var res3 = commit(m1+m2,r1+r2);
    var res4 = res.add(res2);
    console.log('***Commit homomorphic test:', eval(res3.equals(res4))); 
    console.log(serializeG1Point(res));
    console.log("r len:", roughSizeOf(r1.toString()));
    console.log("commit len:", roughSizeOf(serializeG1Point(res)));
    
}

function _test_AdaptorSig() {
  console.log('***Adaptor signature test:');
  console.log('PreSig:');
  var m=["11","22","33"];
  var _m= m.join("");//整合为字符串
  var hash=crypto.createHash("sha256").update(_m).digest("hex");
  _m=new BN(hash,16);
  const sk=randomExponent();
  const y=randomExponent();
  const pk=g.mul(sk);
  const Y=g.mul(y);
  //console.log("q:",q);
  const sig=AdaptorPreSig(_m, Y, sk);
  console.log("Asig len:", roughSizeOf(sig));
  console.log('y:',y.toString(16));
  //console.log('r:',sig.r.toString(16));
  //console.log('s:',sig.s.toString(16));
  //console.log('Rtilde:',sig.Rtilde.encode('hex', true));
  //console.log('pi:',sig.pi.z);
  //生成伪签名
  var m2=crypto.createHash("sha256").update("1234").digest("hex");
  var _m2= new BN(m2,16);
  const sig2 = AdaptorPreSig(_m2, Y, sk)
  var flag=AdaptorPreVf(_m, sig, Y, pk);
  var flag2=AdaptorPreVf(_m2, sig, Y, pk);
  console.log('PreVerify with true sig:',flag);
  console.log('PreVerify with fake sig:',flag2);

  var r_sig=Adapt(sig,y);
  flag=ecdsaVf(_m,sig,pk);
  //flag=key.verify(_m,r_sig);
  console.log('Adapt sig verified by normal ecdsa:',flag);
  //console.log('new s:',r_sig.s.toString(16));
  
  const _y=ExtractFromSig(sig, r_sig , Y);
  console.log('Extract _y equal to y:',_y.eq(y));
  //测试普通ecdsa签名
  const sig3 = ecdsaSig(_m, sk);
  console.log("normal sig:", ecdsaVf(_m, sig3,pk));
}

function _test_RSoRC(){
  console.log("***Test RSoRC***")
  const {sk,pk} = rsorcKeyGen();
  //console.log("sk:",sk);
  //console.log("pk:",pk);
  const state = RandomG1Point();
  const com1 = RandomG1Point();
  const com2 = RandomG1Point();
  console.log("com1:",com1);
  const sig = rsorcSign(sk, state, com1, com2);
  //console.log(sig);
  //console.log("puz len:", roughSizeOf(sig));

  const flag1 = rsorcVf(pk,sig,state,com1, com2);
  console.log("Verify rsorc sig:", flag1);
  const rand = rsorcRandomize(sig, state, com1, com2);
  console.log("com1':", rand.com1);
  const commtBeta = commit(BigInt(0),rand.r1);
  const addcom1=com1.add(commtBeta);
  console.log(addcom1.add((commtBeta).negate()).toAffine());
  const flag2 = rsorcVf(pk,rand.sig,rand.statement,rand.com1,rand.com2);
  console.log("Verify Randomized rsorc sig:", flag2);

  //console.log(rand);
}
function _test_QF(){
    //console.log(g_q.reduce());
    const qf1 = QuadraticForm.qfi(2,1,3);
    const qf2 = QuadraticForm.qfi(2,-1,3);
    //console.log(qf1.pow(5));
    

}  
function _test_cl() {
  console.log("***CL Encryption test");
  const {sk, pk} = clKeyGen();
  const w = randomExponent();
  const beta = randomExponent();
  const c = clEnk(pk, w);
  const crand = clRand(c, beta, pk);
  const w2 = clDec(sk, c);
  const w_rand = clDec(sk, crand);
  const w3 = cldRandm(w_rand, beta);
  //console.log(c.fm.delt.eq(c.c1.delt));
  console.log(w2);
  console.log(w_rand);
  const flag = w.eq(w2);
  const flag2 = w.eq(w3);
  console.log("Dec correctness:",flag);
  console.log("Dec correctness with Randomness:", flag2);
  //console.log("cl len:", roughSizeOf(c));
}
function _test_cl_2() {
  const {sk, pk} = clKeyGen();
  let sum_cpt = clEnk(pk,new BN(0));

  const r_ = new BN("34596432121518698584817730625276513039722785738146466726094573873909439627402").mod(q.m);
  sum_cpt = clRand(sum_cpt, r_, pk);//同态加Enk(r+beta)
  console.log(clDec(sk,sum_cpt));
  
  sum_cpt = clEnk(pk,new BN("c611a5fb1f031ffd740184efe4d6d3e6bf6f3c3ac0e7977d302fbda25af69238",16));
  const r_2 = new BN("34596432121518698584817730625276513039722785738146466726094573873909439627402").mod(q.m);
  sum_cpt = clRand(sum_cpt, r_2, pk);//同态加Enk(r+beta)
  console.log(clDec(sk,sum_cpt));
}

function _test_Puzzle(){
  console.log("***Puzzle test");
  const {sk, pk} = clKeyGen();
  
  const puz = formPuzzle(pk);
  //console.log(puz);
  const puz2 = {
    w1:puz.w1.toString(),
    w2:puz.w2.toString(),
    A1:representate(puz.A1),
    A2:serializeG1Point(puz.A2),
    c:puz.c,
  }
  console.log("puz len:", roughSizeOf(puz2));
}
function _test_R1Proof(h,b,n,m) {
  console.log("***Start R1 prove...");
  const r =RandomEx();
  const r1prover = new R1Prover(h,b,r,n,m);
  const r1proof = new R1Proof;
  r1prover.prove(r1proof);
  //console.log(r1proof);
  const r1vf = new R1Verifier(h, r1prover.B_commit, n, m);
  const r1flag = r1vf.verify(r1proof);
  console.log("***Verify:",r1flag);
}

function _test_ZKProof(){
  const n = 4;
  const m = 2;
  const _h = new Array();
  const b =new Array();
  const r =RandomEx();
  let h;
  for (let i = 0; i < m; i++) {
    h = RandomG1Point();
    _h.push(h);
    b.push(BigInt(1));
    for (let j = 1; j < n; j++) {
      h = RandomG1Point();
      _h.push(h);
      b.push(BigInt(0));
    }
  }
  //console.log(_h);
  // b[0] = BigInt(0);
  // b[4] = BigInt(0);
  // b[1] = BigInt(1);
  // b[5] = BigInt(1);
  // console.log(b);
  
  console.log("***Start OOOM prove...");
  const N =16;
  const index=5;
  const h_gens = new Array(n * m);
  for (let i = 0; i < h_gens.length; i++) {
    h_gens[i] = RandomG1Point();
  }
  h_gens[0] = BASE2;
  const sigprover = new SigmaProver(h_gens,n,m);
  const commits = new Array();
  const beta = RandomEx();
  const tmp = RandomG1Point();
  const tmp_neg = tmp.negate();
  const zero = BigInt(0);
    for (let i = 0; i < N; i++) {
    if (i == index) {
      const c = commit(zero, r).add(tmp).add(tmp_neg);
      commits.push(c);
    } else {
      commits.push(RandomG1Point().add(tmp).add(tmp_neg));
    }
  }
  console.log(commits);
  const sigproof = sigprover.prove(commits, index, r);
  //console.log(sigproof);
  const sigvf = new SigmaVerifier(h_gens,n,m);
  const sigflag = sigvf.verify(commits, sigproof);
  console.log("***Verify:",sigflag);

   const sigma = convertToSigma(index,n ,m);
  // _test_R1Proof(_h,b,n,m);
  // _test_R1Proof(h_gens,b,n,m);
   //_test_R1Proof(h_gens,sigma,n,m);

}

function _test_PCCT(){
  console.log("###Step1: PuzzleRequest.###");
  const v =20;
  const addrR = "1234567890";
  const PuzReq = PuzzleRequest(v, addrR);
  //console.log(PuzReq);

  console.log("\n###Step2: PuzzlePromise.###");
  const ctxR = "1234567asdfghj";
  const hash=crypto.createHash("sha256").update(ctxR).digest("hex");
  const ctxRH=new BN(hash,16);
  const clKey = clKeyGen();
  const Ch2Key = ChainKeyGen();
  const rsKey = rsorcKeyGen();
  const com_2 = RandomG1Point();
  const PuzPro = PuzzlePromise (clKey, Ch2Key, rsKey, ctxRH, PuzReq.com_R, com_2);
  //console.log(PuzPro);
  console.log("Witness generated: ",PuzPro.puzzle.w1);
  console.log("\n###Step3: PuzzleSove.###");
  const ctxS = "987654321kjhgfdsa";
  const hashs=crypto.createHash("sha256").update(ctxR).digest("hex");
  const ctxSH=new BN(hashs,16);
  
  const A1 = PuzPro.puzzle.A1;
  const A2 = PuzPro.puzzle.A2;
  const Rsig = PuzPro.Rsig;
  const Asig = PuzPro.Asig;
  const c = PuzPro.puzzle.c;
  const Ch1Key = ChainKeyGen();
  const PuzSov =PuzzleSove(A1, A2, Rsig, Asig, c, rsKey.pk, Ch2Key.pk, clKey.pk, ctxSH, ctxRH, PuzReq.com_R, com_2, Ch1Key);
  //console.log(PuzSov);

  console.log("\n###Step4: Process Escrow.###")
  const A1r = PuzSov.A1Rand;
  const A2r = PuzSov.A2Rand;
  const cr = PuzSov.cRand;
  const com_S = PuzSov.com_S;
  const com_2r = PuzSov.com_2;
  const Asigr = PuzSov.Asig;
  const Rsigr = PuzSov.Rsig;
  const SenderSig=ProcessEscrow(clKey, rsKey, ctxSH, cr, A1r, A2r, com_S, com_2r, Asigr, Rsigr ,Ch1Key.pk);

  console.log("\n###Step5: Process Redeem.###")
  //console.log(SenderSig);
  //console.log(Asigr);
  const PR = ProcessRedeem(SenderSig, Asigr, Asig, A1r,  PuzSov.beta, ctxRH, Ch2Key.pk);
  
  console.log("Witness extracted:",PR.w);
}

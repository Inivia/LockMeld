
import Web3 from 'web3';
import BN from 'bn.js';

import params from "./params.js";
const { f, h, g, q, zero, curve} = params;
import primitives from "./primitives.js";
const { randomExponent, 
  randomGroupElement, 
  AdaptorPreSig, 
  AdaptorPreVf,
  Adapt,
  ExtractFromSig,
  ecdsaVf,
} =primitives;
import seri from "./serialize.js";
const {
  serialize,
  deserialize,
  serializeSigmaProof,
  serializeAux,
  toBytes,
}=seri;
import rsorc from "./rsorc.js";
const {
    RandomEx,
    RandomG1Point,
    commit,
    rsorcSkGen,
    rsorcPkGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
} = rsorc;

//const { SigmaProver } = require("./prover");
//const { SigmaVerifier } = require("./verifier");
import crypto  from "crypto";

//对primitives进行测试
testPrimitives()


function testPrimitives() {
  //_test_commit();//测试承诺
  //_test_AdaptorSig();//测试AdaptorSig
  _test_RSoRC();//测试可随机化承诺的可随机化签名
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
    //console.log('C(m1+m2,r1+r2)= ',res3.toBytes());
    //console.log('C1+C2= ', res4.toBytes());
    
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
  const sig=AdaptorPreSig(_m, g, q, Y, sk);
  console.log('y:',y.toString(16));
  //console.log('r:',sig.r.toString(16));
  //console.log('s:',sig.s.toString(16));
  //console.log('Rtilde:',sig.Rtilde.encode('hex', true));
  //console.log('pi:',sig.pi.z);
  //生成伪签名
  var m2=crypto.createHash("sha256").update("1234").digest("hex");
  var _m2= new BN(m2,16);
  const sig2 = AdaptorPreSig(_m2, g, q, Y, sk)
  var flag=AdaptorPreVf(_m, g, q, sig, Y, pk);
  var flag2=AdaptorPreVf(_m2, g, q, sig, Y, pk);
  console.log('PreVerify with true sig:',flag);
  console.log('PreVerify with fake sig:',flag2);

  var r_sig=Adapt(sig,y,q);
  flag=ecdsaVf(_m,sig,pk,g,q);
  //flag=key.verify(_m,r_sig);
  console.log('Adapt sig verified by normal ecdsa:',flag);
  //console.log('new s:',r_sig.s.toString(16));
  
  const _y=ExtractFromSig(sig, r_sig ,q, Y);
  console.log('Extract _y equal to y:',_y.eq(y));

}

function _test_RSoRC(){
  console.log("***Test RSoRC***")
  const sk = rsorcSkGen();
  const pk = rsorcPkGen(sk);
  //console.log("sk:",sk);
  //console.log("pk:",pk);
  const state = RandomG1Point();
  const com1 = RandomG1Point();
  const com2 = RandomG1Point();
  const sig = rsorcSign(sk, state, com1, com2);
  //console.log(sig);
  const flag1 = rsorcVf(pk,sig,state,com1, com2);
  console.log("Verify rsorc sig:", flag1);
  const rand = rsorcRandomize(sig, state, com1, com2);
  const flag2 = rsorcVf(pk,rand.sig,rand.statement,rand.com1,rand.com2);
  console.log("Verify Randomized rsorc sig:", flag2);

  //console.log(rand);
}
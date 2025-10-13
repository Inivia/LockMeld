//pcct协议的链下流程整合

import BN from 'bn.js';
import { concatBytes, randomBytes } from '@noble/curves/utils.js';
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
    rsorcKeyGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
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
//由receiver执行，生成承诺后的交易值发送给Tumbler
function PuzzleRequest (v, addrR) {
    console.log("generate commit...");
    const vBE = BigInt(v);
    const com_r = RandomEx();
    const com_v = commit(vBE, com_r);
    console.log("done.");
    return {
        addrR: addrR,
        com_R:com_v,
    }
}
//由Tumbler执行，生成谜题及相关签名
//clKey用于Cl加密 Ch2Key为R所在链密钥 ctxR为向Receiver承诺的交易
function PuzzlePromise (clKey, Ch2Key, rsorcKey, ctxR, com_R, com_2) {
    console.log("Form Puzzle...");
    const puz = formPuzzle(clKey.pk);
    console.log("done.");
    console.log("Adaptor Sig...");
    const Asig = AdaptorPreSig(ctxR, puz.A1, Ch2Key.sk);
    console.log("done.");
    console.log("RSoRC Sig...");
    const rsorcSig = rsorcSign (rsorcKey.sk, puz.A2, com_R, com_2);
    console.log("done.");
    return {
        puzzle:puz,
        Asig: Asig,
        Rsig: rsorcSig,
    }
}
//由Sender执行，负责检验PuzPro提供的签名，以及提供OOOMProof和新的Adaptorsig
function PuzzleSove(A1, A2, Rsig, Asig, c, TrsPk, TChPk, TClPK, ctxS, ctxR, com_R, com_2, Ch1Key) {
    console.log("Start Verifying...");
    if (!AdaptorPreVf(ctxR, Asig, A1, TChPk)) {
        console.log("Adaptor Signature Invalid!");
        return;
    }
    if (!rsorcVf(TrsPk, Rsig, A2, com_R, com_2)) {
        console.log("RSoRC Signature Invalid!");
        return;
    }
    console.log("done.");

    console.log("Randomize RSORC tuples...");
    //随机数r1使得w'=w+r1
    const rand = rsorcRandomize(Rsig, A2, com_R, com_2);
    const r1BN = new BN(rand.r1.toString()).mod(q.m);
    const A1Rand = A1.add(g.mul(r1BN));
    const cRand = clRand(c, r1BN, TClPK);
    console.log("done.");

    console.log("Adaptor Sig...");
    const AsigS = AdaptorPreSig(ctxS, A1Rand, Ch1Key.sk);
    console.log("done.");

    console.log("generate OOOM Proof...");
    const pi ={};
    console.log("done.");
    return {
        beta: rand.r1,
        Asig : AsigS,
        Rsig : rand.sig,
        cRand: cRand,
        A1Rand: A1Rand,
        A2Rand: rand.statement,
        com_S: rand.com1,
        com_2: rand.com2,
        pi: pi,
    }

}

//由Tumbler执行，检验完Sender提供的数据后，解密并完成Adaptor sig
function ProcessEscrow(clKey, Ch2Key, rsorcKey, ctxS, c, A1, A2, com_S, com_2, Asig, Rsig, Spk){
    console.log("Start Verifying...");
    if (!AdaptorPreVf(ctxS, Asig, A1, Spk)) {
        console.log("Adaptor Signature Invalid!");
        return;
    }
    if (!rsorcVf(rsorcKey.pk, Rsig, A2, com_S, com_2)) {
        console.log("RSoRC Signature Invalid!");
        return;
    }
    console.log("done.");

    console.log("Start CL Decryption...");
    const w = clDec(clKey.sk, c);
    console.log("done.")
    console.log("Adapt to complete sig...");
    const newAsig = Adapt(Asig,w);
    console.log(ecdsaVf(ctxS, newAsig, Spk));

    return newAsig;
}

//由Receiver执行，从Tumbler生成的完整签名中提取出秘密值并解随机化，生成自己的完整签名
function ProcessRedeem(Ssig, Spresig, Tpresig, A1r,  beta, ctxR, pk){
    console.log("Extract from sig and presig...");
    const w_beta = ExtractFromSig(Spresig, Ssig, A1r);
    const betaBN = new BN(beta.toString()).mod(q.m);
    const w = cldRandm(w_beta, betaBN);
    console.log("done.")
    console.log("Adapt to complete sig...")
    const newAsig = Adapt(Tpresig, w);
    console.log(ecdsaVf(ctxR, newAsig, pk));
    return {
        w:w,
        sig: newAsig,
    }
}

export default {
    PuzzleRequest,
    PuzzlePromise,
    PuzzleSove,
    ProcessEscrow,
    ProcessRedeem,
};
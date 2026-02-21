// const crypto = require("crypto");
// const BN = require("bn.js");
// const params = require("./params");
// const { serialize, representate } = require("./serialize");
// const Web3 = require("web3");//与以太坊交互的库

import crypto from 'crypto';
import BN from 'bn.js';
import params from './params.js';
import _serialize from './serialize.js';
const { serialize, representate }=_serialize;
import Web3 from 'web3';
const { f, h, g, q, zero, curve} = params;
function toBN10(str) {
  return new BN(str, 10);
}
//对消息m和随机数r进行P承诺
function commit(g, m, h, r) {
  return g.mul(m).add(h.mul(r));
}

//生成一个随机的乘数（标量）
function randomExponent() {
  return new BN(crypto.randomBytes(32)).mod(params.curve.n);
}
//随机群元素
function randomGroupElement() {
  const seed_red = randomExponent().toRed(params.p);//模p计算下的随机指数
  const p_1_4 = params.curve.p.add(new BN(1)).div(new BN(4));//(p+1)/4
  while (true) {
    //y^2=x^3+3
    const y_squared = seed_red
      .redPow(new BN(3))
      .redAdd(new BN(3).toRed(params.p));
    const y = y_squared.redPow(p_1_4);
    //在曲线上
    if (y.redPow(new BN(2)).eq(y_squared)) {
      return params.curve.point(seed_red.fromRed(), y.fromRed());
    }
    seed_red.redIAdd(new BN(1).toRed(params.p));
  }
}
//生成密钥对
function ChainKeyGen(){
  const sk = randomExponent();
  const pk = g.mul(sk);
  return {
    sk:sk,
    pk:pk,
  }
}
//把大数变成m进制（零知识相关）
function convertToSigma(num, n, m) {
  const out = new Array();
  var j = 0;
  for (j = 0; j < m; j++) {
    const rem = num % n;
    num = Math.floor(num / n);
    for (let i = 0; i < n; i++) {
      out.push(i == rem ? new BN(1) : new BN(0));
    }
  }
  return out;
}

//多项式中添加新的因子(x*t+a)，t为变量
function newFactor(x, a, coefficients) {
  const degree = coefficients.length;//最高次项的次数
  coefficients.push(x.mul(coefficients[degree - 1]));
  for (let d = degree - 1; d >= 1; d--) {
    coefficients[d] = a.mul(coefficients[d]).add(x.mul(coefficients[d - 1]));
    //a_d=a_d*a+a_(d-1)*X
  }
  coefficients[0] = coefficients[0].mul(a);//a_0*a
}
//基于ECDSA的adaptor signature
//Y=g*y的谜题 m为信息(的hash值) g为生成元 q为群的阶
function AdaptorPreSig(m, Y, sk) {
  //生成预签名
  var k, Rtilde, R, r, s;
  const _q = q.m; //q回到BN格式
  do{
    do {
      k= randomExponent();
      Rtilde = g.mul(k);
      R=Y.mul(k);
      r=R.getX().mod(_q);
    }while (r.isZero());
    
    const kinv = k.invm(_q);
    s = m.add(sk.mul(r)).mod(_q);
    s = s.mul(kinv).mod(_q);

  //console.log('RtildeSig:',Rtilde.encode('hex', true));
  }while (s.isZero());
  //生成证明
  var pi=zkDHTupleProve(_q, g, Y, Rtilde, R, k);

  return {
    r:r,
    s:s,
    R:R,
    Rtilde:Rtilde,
    pi:pi
  }
}
function AdaptorPreVf(m, sig, Y, pk) {
  const _q = q.m;
  //范围检查
  if (sig.r.isZero() || sig.s.isZero() || sig.r.gte(_q) || sig.s.gte(_q)) return false;
  
  const sInv = sig.s.invm(_q);
  const u = m.mul(sInv).mod(_q);
  const v = sig.r.mul(sInv).mod(_q);
  const Rtilde = g.mul(u).add(pk.mul(v));
  //console.log('RtildeVf:',Rtilde.encode('hex', true));
  const _xR = Rtilde.getX().mod(_q);
  const xR = sig.Rtilde.getX().mod(_q);
  if (!xR.eq(_xR)) return false;
  if (!zkFHTupleVf(sig.pi, g, _q, Y, sig.Rtilde, sig.R)) return false;

  return true;
}
//知道y的零知识证明
function zkDHTupleProve(q, g, Y, U, V, w) {
  var e, r;
  var proof = {};
  r = randomExponent();
  proof.a = g.mul(r);
  proof.b = Y.mul(r);
  var a = representate(proof.a);
  var b = representate(proof.b);
  var u = representate(U);
  var v = representate(V);
  e = crypto.createHash("sha256").update(a+b+u+v).digest("hex");
  e = new BN(e,16);
  var z = r.add(e.mul(w)).mod(q);
  proof.z = z;
  return proof;

}

function zkFHTupleVf(proof, g, q, Y, U, V) {
  
  var a = representate(proof.a);
  var b = representate(proof.b);
  var u = representate(U);
  var v = representate(V);
  var e = crypto.createHash("sha256").update(a+b+u+v).digest("hex");
  e = new BN(e,16);

  var gtoz = g.mul(proof.z);
  var utoe = U.mul(e);
  var a_utoe = proof.a.add(utoe);
  var htoz = Y.mul(proof.z);
  var vtoe = V.mul(e);
  var b_vtoe = proof.b.add(vtoe);

  if ((gtoz.eq(a_utoe))&&(htoz.eq(b_vtoe))) return true;
  return false;

}

function Adapt(presig,y){
  const _q=q.m;
  const yInv=y.invm(_q);
  var sig={
    r:presig.r,
    s:presig.s,
    R:presig.R,
    Rtilde:presig.Rtilde,
    pi:presig.pi
  }

  sig.s=sig.s.mul(yInv).mod(_q);
  return sig;
}

function ExtractFromSig(presig, sig , Y){
  const _q = q.m;
  const sInv=sig.s.invm(_q);
  //console.log("sig.s:",sig.s);
  //console.log("presig.s:",presig.s);
  const _y = sInv.mul(presig.s).mod(_q);
  
  return _y;

}
function ecdsaVf(m,sig,pk) {
  const _q = q.m;
  //范围检查
  if (sig.r.isZero() || sig.s.isZero() || sig.r.gte(_q) || sig.s.gte(_q)) return false;
  
  const sInv = sig.s.invm(_q);
  const u = m.mul(sInv).mod(_q);
  const v = sig.r.mul(sInv).mod(_q);
  const R = g.mul(u).add(pk.mul(v));
  //console.log('RtildeVf:',Rtilde.encode('hex', true));
  const xR = sig.r;
  if (!xR.eq(xR)) return false;

  return true;
}
function ecdsaSig(m,sk) {
  const _q = q.m;
  let k, R, xR, r, s;
  
  do {
    do {
      k= randomExponent();  // 生成 1 到 q-1 之间的随机大整数
    } while (k.isZero());
    
    R = g.mul(k);
    r = R.getX().mod(_q);
    if (r.isZero()) continue;
    
    // 计算 s = k^-1 * (m + r * sk) mod q
    const kInv = k.invm(_q);
    const mPlusRsk = m.add(r.mul(sk)).mod(_q);
    s = kInv.mul(mPlusRsk).mod(_q);
    
    // 如果 s = 0，重新选择 k
  } while (s.isZero());
  
  return { r: r, s: s };
}

export default {
  toBN10,
  commit,
  randomExponent,
  randomGroupElement,
  AdaptorPreSig,
  AdaptorPreVf,
  Adapt,
  ExtractFromSig,
  ecdsaVf,
  ecdsaSig,
  ChainKeyGen,
};

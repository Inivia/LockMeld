import {bls12_381, bls12_381_Fr} from "@noble/curves/bls12-381.js";
import { randomBytes, bytesToNumberBE } from '@noble/curves/utils.js';
import {mod, invert} from '@noble/curves/abstract/modular.js';
import crypto from 'crypto';
const { G1, G2, pairing ,fields} = bls12_381;
const zero = G1.Point.ZERO;
import rsorc from "./rsorc.js";
const {
    order,
    RandomEx,
    RandomG1Point,
    commit,
    commitBits,
    multiExponents,
    rsorcKeyGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
} = rsorc;
import srlz from "./serialize.js";
const {serializeG1Point} = srlz;
//_test_commitBits();
//console.log(generateChallenge(G1.Point.BASE));
//console.log(convertToSigma(48,4,2));
//console.log(convertToNal(123,10,5));
//console.log(BigInt(5)**BigInt(2));
function _test_commitBits() {
    let h=[];
    let exp = [];
    for (let i=0;i<10;i++) {
        h.push(RandomG1Point());
        exp.push(BigInt(0));
    }
    //console.log(h);
    const r = RandomEx();
    const res = commitBits(h , exp, r);
    console.log(res);
}
function generateChallenge(points){
    let msg;
    for (let i=0;i<points.length;i++) {
        const m = serializeG1Point(points[i]);
        const _m = m[0][0].slice(2)+m[0][1].slice(2)+m[1][0].slice(2)+m[1][1].slice(2);
        msg+=_m;
    }
    //console.log(_m);
    let hash=crypto.createHash("sha256").update(msg).digest("hex");
    let res =  BigInt('0x'+hash);
    return (res%order+order)%order;
}
function convertToSigma(num, n, m){
    const out = new Array();
    var j = 0;
    for (j = 0; j < m; j++) {
    const rem = num % n;
    num = Math.floor(num / n);
    for (let i = 0; i < n; i++) {
        out.push(i == rem ? BigInt(1) : BigInt(0));
    }
  }
  return out;
}

function convertToNal(num, n, m) {
  const out = new Array();
  var j = 0;
  while (num != 0) {
    const rem = num % n;
    num = Math.floor(num / n);
    out.push(rem);
    j++;
  }
  if (out.length > m) return out.slice(0, m);
  if (out.length < m)
    out.splice(out.length, 0, ...new Array(m - out.length).fill(0));
  return out;
}
function newFactor(x, a, coefficients) {
  const degree = coefficients.length;
  coefficients.push((x*coefficients[degree - 1])%order);
  for (let d = degree - 1; d >= 1; d--) {
    coefficients[d] = (a*coefficients[d]+(x*coefficients[d - 1]))%order;
  }
  coefficients[0] = (coefficients[0]*a)%order;
}
class R1Proof {
  constructor() {
    this.A = zero;
    this.C = zero;
    this.D = zero;
    this.f = [];
    this.ZA = BigInt(0);
    this.ZC = BigInt(0);
  }
}
class SigmaProof {
  constructor() {
    this.n = 0;
    this.m = 0;
    this.B = zero;
    this.r1Proof = new R1Proof();
    this.Gk = [];
    this.z = BigInt(0);
  }
}
class R1Prover {
    constructor(h, b, r, n, m) {
    this.g = G1.Point.BASE;
    this.h = h;
    this.b = b;
    this.r = r;
    this.n = n;
    this.m = m;
    this.B_commit = commitBits(h, b, r);
    this.rA = BigInt(0);
    this.rC = BigInt(0);
    this.rD = BigInt(0);
  }
  prove(proof_out, skip=false) {
    const a_out = new Array(this.n * this.m);
    a_out.fill(BigInt(0));
    for (let j = 0; j < this.m; j++) {
      for (let i = 1; i < this.n; i++) {
        a_out[j * this.n + i] = RandomEx();
        a_out[j * this.n] = a_out[j * this.n]-(a_out[j * this.n + i]);
      }
    }
    this.rA = RandomEx();
    const A = commitBits(this.h, a_out, this.rA);
    proof_out.A = A;
    const c = new Array(this.n * this.m);
    for (let i = 0; i < c.length; i++) {
      c[i] = a_out[i]*(BigInt(1)-(this.b[i]*(BigInt(2))));
    }

    this.rC = RandomEx();
    const C = commitBits(this.h, c, this.rC);
    proof_out.C = C;

    const d = new Array(this.n * this.m);
    for (let i = 0; i < d.length; i++) {
      d[i] = -(a_out[i]*a_out[i]);
    }

    this.rD = RandomEx();
    const D = commitBits(this.h, d, this.rD);
    proof_out.D = D;
    if (!skip) {
    const group_elements = new Array(A, this.B_commit, C, D);
    const x = generateChallenge(group_elements);
    this.generateFinalResponse(a_out, x, proof_out);}
    // proof_out.f.splice(0);
    // for (let j = 0; j < this.m; j++) {
    //   for (let i = 1; i < this.n; i++) {
    //     proof_out.f.push(
    //       this.b[j * this.n + i]*x+(a_out[j * this.n + i])
    //     );
    //   }
    // }
    // proof_out.ZA = (this.r*x+this.rA)%order;
    // proof_out.ZC = (this.rC*x+this.rD)%order;

    return a_out;
  }
  generateFinalResponse(a, c_x, proof_out) {
    proof_out.f.splice(0);
    for (let j = 0; j < this.m; j++) {
      for (let i = 1; i < this.n; i++) {
        proof_out.f.push(
          this.b[j * this.n + i]*c_x+(a[j * this.n + i])
        );
      }
    }
    proof_out.ZA = (this.r*c_x+this.rA)%order;
    proof_out.ZC = (this.rC*c_x+this.rD)%order;
  }
}
class R1Verifier {
  constructor(h, B, n, m) {
    this.g = G1.Point.BASE;
    this.h = h;
    this.B_commit = B;
    this.n = n;
    this.m = m;
  }
  verify(proof, skip = false) {
    const f = new Array();
    return this._verify(proof, f, skip);
  }
  _verify(proof, f_out, skip){
    if (
      proof.A.equals(zero) ||
      proof.C.equals(zero) ||
      proof.D.equals(zero) ||
      this.B_commit.equals(zero)
    )
      return false;
    for (let i = 0; i < proof.f.length; i++) {
      if (proof.f[i]===BigInt(0)) return false;
    }
    if (proof.ZA===BigInt(0) || proof.ZC===BigInt(0)) return false;
    if (!skip){
    const group_elements = [proof.A, this.B_commit, proof.C, proof.D];
    const x = generateChallenge(group_elements);
    return this.verify_final_response(proof, x, f_out);}
    return true;
  }
  verify_final_response(proof, challenge_x, f_out) {
    const f = proof.f;
    for (let j = 0; j < f.length; ++j) {
      if (f[j]===(challenge_x)) return false;
    }

    f_out.splice(0);
    for (let j = 0; j < this.m; j++) {
      f_out.push(BigInt(0));
      let tmp = BigInt(0);
      const k = this.n - 1;
      for (let i = 0; i < k; i++) {
        tmp = (tmp+(f[j * k + i]))%order;
        f_out.push(f[j * k + i]);
      }
      f_out[j * this.n] = (challenge_x-tmp+order)%order;
    }

    const one = commitBits(this.h, f_out, proof.ZA);

    if (!one.equals(this.B_commit.multiply(challenge_x).add(proof.A))) {
      return false;
    }

    const f_outprime = new Array(f_out.length);
    for (let i = 0; i < f_out.length; i++) {
      const exp = (challenge_x-f_out[i]+order)%order;
      f_outprime[i] = (f_out[i]*exp)%order;
    }

    const two = commitBits(this.h, f_outprime, proof.ZC);
    if (!two.equals(proof.C.multiply(challenge_x).add(proof.D))) {
      return false;
    }

    return true;
  }
}

class SigmaProver {
  constructor(h, n, m) {
    this.h = h;
    this.n = n;
    this.m = m;
  }

  prove(commits, l, r) {
    const proof_out = new SigmaProof();
    const setSize = commits.length;

    const rB = RandomEx();
    const sigma = convertToSigma(l, this.n, this.m);

    const Pk = new Array(this.m);
    for (let k = 0; k < Pk.length; k++) {
      Pk[k] = RandomEx();
    }

    const r1prover = new R1Prover(this.h, sigma, rB, this.n, this.m);
    proof_out.B = r1prover.B_commit;
    const a = r1prover.prove(proof_out.r1Proof, true);
    const N = setSize;
    const P_i_k = new Array(N);
    for (let i = 0; i < N; i++) P_i_k[i] = new Array();
    for (let i = 0; i < N; i++) {
      const coefficients = P_i_k[i];
      const I = convertToNal(i, this.n, this.m);
      coefficients.push(a[I[0]]);
      coefficients.push(sigma[I[0]]);
      for (let j = 1; j < this.m; j++) {
        newFactor(sigma[j * this.n + I[j]], a[j * this.n + I[j]], coefficients);
      }
    }
    const Gk = new Array(this.m);
    for (let k = 0; k < this.m; k++) {
      const P_i = new Array(N);
      for (let i = 0; i < N; i++) {
        P_i[i] = P_i_k[i][k];
      }
      const c_k = multiExponents(commits, P_i).add(
        this.h[0].multiply(Pk[k])
      );
      Gk[k] = c_k;
    }
    proof_out.Gk = Gk;
    const group_elements = [
      proof_out.r1Proof.A,
      proof_out.B,
      proof_out.r1Proof.C,
      proof_out.r1Proof.D,
    ];
    group_elements.splice(group_elements.length, 0, ...Gk);

    const x = generateChallenge(group_elements);
    r1prover.generateFinalResponse(a, x, proof_out.r1Proof);
    let z = r*(x**(BigInt(this.m))%order)%order;
    let sum = BigInt(0),
      x_k = BigInt(1);
    for (let k = 0; k < this.m; k++) {
      sum = (sum+(Pk[k]*(x_k)%order))%order;
      x_k = (x_k*(x))%order;
    }
    z = ((z-sum)%order+order)%order;
    proof_out.z = z;
    return proof_out;
  }
}
class SigmaVerifier{
    constructor(h_gens, n, m) {
    this.h = h_gens;
    this.n = n;
    this.m = m;
  }
  verify(commits, proof) {
    const r1verifier = new R1Verifier(this.h, proof.B, this.n, this.m);
    const r1proof = proof.r1Proof;
    if (!r1verifier.verify(r1proof,true)) return false;

    if (proof.B.equals(zero)) return false;

    const Gk = proof.Gk;
    for (let i = 0; i < Gk.length; i++) {
      if (Gk[i].equals(zero)) return false;
    }

    const group_elements = new Array(r1proof.A, proof.B, r1proof.C, r1proof.D);
    group_elements.splice(group_elements.length, 0, ...Gk);
    const challenge_x = generateChallenge(group_elements);
    const f = new Array();
    if (!r1verifier.verify_final_response(r1proof, challenge_x, f))
      return false;

    if (proof.z===BigInt(0)) return false;
    if (commits.length == 0) return false;

    const N = commits.length;
    const f_i_ = new Array(N);
    for (let i = 0; i < N; i++) {
      const I = convertToNal(i, this.n, this.m);
      let f_i = BigInt(1);
      for (let j = 0; j < this.m; j++) {
        f_i = f_i*(f[j * this.n + I[j]])%order;
      }
      f_i_[i] = f_i;
    }

    const t1 = multiExponents(commits, f_i_);

    let t2 = zero;
    let x_k = BigInt(1);
    for (let k = 0; k < this.m; k++) {
        const tmpxk =((-x_k)%order+order)%order;
      t2 = t2.add(Gk[k].multiply(tmpxk));
      x_k = (x_k*(challenge_x))%order;
    }

    const left = t1.add(t2);
    const cmp = this.h[0].multiply(proof.z);

    if (!left.equals(cmp)) {
      return false;
    }
    return true;
  }
}
export default {
    R1Proof, 
    SigmaProof,
    R1Prover,
    R1Verifier,
    SigmaProver,
    SigmaVerifier,
    convertToSigma,
}
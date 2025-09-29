
import {bls12_381, bls12_381_Fr} from "@noble/curves/bls12-381.js";
import { randomBytes, bytesToNumberBE } from '@noble/curves/utils.js';
import {mod, invert} from '@noble/curves/abstract/modular.js';
import crypto from 'crypto';
import BN from 'bn.js';
const { G1, G2, pairing ,fields} = bls12_381;
const Fp12 = fields.Fp12;
const Fr = bls12_381_Fr;
const order = Fr.ORDER;
const base2 = BigInt("22824058396503438075525774212889175598789903735559148755085891678973294908085");
const BASE2 = G1.Point.BASE.multiply(base2);


//G1上的随机mask（乘数）
function RandomEx() {
    const r = randomBytes();
    var _r=bytesToNumberBE(r);
    _r=_r%order;
    return _r;
}
//随机G1上的点
function RandomG1Point() {
    const r = RandomEx();
    const p = G1.Point.BASE.multiply(r);
    return p;
}

//Pedersen 承诺
function commit(m, r) {
    m = m%order;
    r = r%order; 
  return G1.Point.BASE.multiply(m).add(BASE2.multiply(r));
}

function rsorcSkGen() {
    const x0 = RandomEx();
    const x1 = RandomEx();
    const x2 = RandomEx();
    return {
        x0:x0,
        x1:x1,
        x2:x2
    };
}

function rsorcPkGen(sk) {
    const y0 = G2.Point.BASE.multiply(sk.x0);
    const y1 = G2.Point.BASE.multiply(sk.x1);
    const y2 = G2.Point.BASE.multiply(sk.x2);
    return {
        y0:y0,
        y1:y1,
        y2:y2
    }
}

function rsorcSign(sk, statement, com1, com2) {
    const r = RandomEx();
    const rInv = invert(r,order);
    const a_g1 = G1.Point.BASE.add(statement.multiply(sk.x0))
                        .add(com1.multiply(sk.x1))
                        .add(com2.multiply(sk.x2))
                        .multiply(rInv);
    const v_g1 = G1.Point.BASE.multiply(r);
    const v_g2 = G2.Point.BASE.multiply(r);
    const t_g1 = G1.Point.BASE.multiply(sk.x0)
                        .add(BASE2.multiply(sk.x1))
                        .add(BASE2.multiply(sk.x2))
                        .multiply(rInv);
    return {
        a_g1:a_g1,
        v_g1:v_g1,
        v_g2:v_g2,
        t_g1:t_g1
    }
                        
}
function rsorcVf(pk,sig,statement,com1, com2) {
    var left1 = pairing(sig.a_g1,sig.v_g2);
    var right1 = pairing(G1.Point.BASE,G2.Point.BASE)
    right1 = Fp12.mul(right1,pairing(statement,pk.y0));
    right1 = Fp12.mul(right1,pairing(com1,pk.y1));
    right1 = Fp12.mul(right1,pairing(com2,pk.y2));                     
    //console.log("left1:",left1);
    //console.log("right1:",right1);
    if (!Fp12.eql(left1,right1)) return false;

    var left2 = pairing(G1.Point.BASE,sig.v_g2);
    var right2 = pairing(sig.v_g1, G2.Point.BASE);
    if (!Fp12.eql(left2,right2)) return false;

    var left3 = pairing(sig.t_g1, sig.v_g2);
    var right3 = pairing(G1.Point.BASE, pk.y0);
    right3 = Fp12.mul(right3,pairing(BASE2, pk.y1));
    right3 = Fp12.mul(right3,pairing(BASE2, pk.y2));
    if (!Fp12.eql(left3,right3)) return false;

    return true;
}

function rsorcRandomize(sig,statement,com1,com2) {
    const r1 = RandomEx();
    const r2 = RandomEx();
    const r2Inv = invert(r2,order);
    const a_g1 = sig.a_g1.add(sig.t_g1.multiply(r1)).multiply(r2Inv);
    const v_g1 = sig.v_g1.multiply(r2);
    const v_g2 = sig.v_g2.multiply(r2);
    const t_g1 = sig.t_g1.multiply(r2Inv);
    const Rsig = {
        a_g1:a_g1,
        v_g1:v_g1,
        v_g2:v_g2,
        t_g1:t_g1
    }
    const Rst=statement.add(G1.Point.BASE.multiply(r1));
    const Rc1 = com1.add(BASE2.multiply(r1));
    const Rc2 = com2.add(BASE2.multiply(r1));
    return {
        sig:Rsig,
        statement:Rst,
        com1:Rc1,
        com2:Rc2,
        r1:r1,
        r2:r2
    }
}


export default {
    RandomEx,
    RandomG1Point,
    commit,
    rsorcSkGen,
    rsorcPkGen,
    rsorcSign,
    rsorcVf,
    rsorcRandomize,
};


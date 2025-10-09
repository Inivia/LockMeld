import EC  from "elliptic"; 
import BN from "bn.js";
//import { bls12_381 } from '@noble/curves/bls12-381.js';

const FIELD_MODULUS = new BN(
  "115792089237316195423570985008687907853269984665640564039457584007908834671663",
  10
);
const GROUP_MODULUS = new BN(
  "115792089237316195423570985008687907852837564279074904382605163141518161494337",
  10
);

const curve = new EC.curve.short({
  a: "0",
  b: "7",
  p: FIELD_MODULUS,
  n: GROUP_MODULUS,
  gRed: false,
  g: [
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8",
  ],
  // bizarre that g is set equal to one of the pedersen base elements. actually in theory not necessary (though the verifier would have to change also).
});

const p = BN.red(curve.p);
const q = BN.red(curve.n);
const zero = curve.g.mul(new BN(0));
const g = curve.g;
const f = curve.g.mul(new BN(11));
const h = curve.g.mul(new BN(7));

export default { curve, g, p, q, zero, f, h };

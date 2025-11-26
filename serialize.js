//信息序列化功能
import params from './params.js';
import crypto  from "crypto";
const { curve, zero } = params;
import BN from 'bn.js';
const EMPTY =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function toBytes(x) {
  return "0x" + x.toString(16, 64);
}
//将曲线上的点转化为128长字符串
function representate(point) {
  if (point.x == null && point.y == null) return EMPTY + EMPTY.slice(2);
  return toBytes(point.getX()) + toBytes(point.getY()).slice(2);
}
//将点分别转化为2个64长度的字符串
function serialize(point) {
  if (point.x == null && point.y == null) return [EMPTY, EMPTY];
  return [toBytes(point.getX()), toBytes(point.getY())];
}
//逆序列化，将两个64字符串恢复为点
function deserialize(serialization) {
  if (serialization[0] == EMPTY && serialization[1] == EMPTY) return zero;
  return curve.point(serialization[0].slice(2), serialization[1].slice(2));
}

function serializeR1Proof(proof) {
  const result = [];
  result.push(serialize(proof.A));
  result.push(serialize(proof.C));
  result.push(serialize(proof.D));
  result.push(proof.f.map((item) => toBytes(item)));
  result.push(toBytes(proof.ZA.mod(curve.n)));
  result.push(toBytes(proof.ZC.mod(curve.n)));
  return result;
}

function serializeSigmaProof(proof) {
  const result = [];
  result.push(serialize(proof.B));
  result.push(serializeR1Proof(proof.r1Proof));
  result.push(proof.Gk.map((item) => serialize(item)));
  result.push(toBytes(proof.z.mod(curve.n)));
  return result;
}

function serializeAux(aux) {
  const result = [];
  result.push(toBytes(new BN(aux.n)));
  result.push(toBytes(new BN(aux.m)));
  result.push(serialize(aux.g));
  result.push(aux.h_gens.map((item) => serialize(item)));
  return result;
}
//将G曲线上的点序列化为32byte的字符串x2
function serializeG1Point(point) {
  const Point = point.toAffine();
  var x = Point.x.toString(16);
  var y = Point.y.toString(16);
    //console.log(x.length);
    while (x.length < 96 ) x = '0'+x;
    while (y.length < 96 ) y = '0'+y;
  const x_0 = x.slice(0,32);
  const x_1 = x.slice(32,96);
  const X = ['0x' + '0'.repeat(32)+x_0, '0x'+x_1];
  const y_0 = y.slice(0,32);
  const y_1 = y.slice(32,96);
  const Y = ['0x' + '0'.repeat(32)+y_0, '0x'+y_1];
  return [X,Y];
}

//将64B字符串拆成4组
function unSeriG1(str) {
  const x_0 = str.slice(0,64);
  const x_1 = str.slice(64,128);
  const y_0 = str.slice(128,192);
  const y_1 = str.slice(192,256);
  return {
    x0:"0x"+x_0,
    x1:"0x"+x_1,
    y0:"0x"+y_0,
    y1:"0x"+y_1,
  }
}
//交易hash
function ctxHash (adds, addr, c){
  const seric = serializeG1Point(c);
  const res= adds+addr+seric[0][0]+seric[0][1]+seric[1][0]+seric[1][1];
  const  hash=crypto.createHash("sha256").update(res).digest("hex");
  return hash;
}
const s="0000000000000000000000000000000017f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb0000000000000000000000000000000008b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1";
//console.log(unSeriG1(s));
export default {
  toBytes,
  representate,
  serialize,
  deserialize,
  serializeSigmaProof,
  serializeAux,
  serializeG1Point,
  ctxHash,
};

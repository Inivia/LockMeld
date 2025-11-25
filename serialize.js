//信息序列化功能
import params from './params.js';
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
  var x = point.X.toString(16);
  var y = point.Y.toString(16);
    //console.log(x.length);
    while (x.length < 96 ) x = '0'+x;
    while (y.length < 96 ) y = '0'+y;
  const x_0 = x.slice(0,32);
  const x_1 = x.slice(32,96);
  const X = ['0x' + '0'.repeat(32)+x_0, '0x'+x_1];
  const y_0 = y.slice(0,32);
  const y_1 = y.slice(32,96);
  const Y = ['0x' + '0'.repeat(32)+y_0, '0x'+y_1];
  return {
    x:X,
    y:Y,
  }

}
export default {
  toBytes,
  representate,
  serialize,
  deserialize,
  serializeSigmaProof,
  serializeAux,
  serializeG1Point,
};

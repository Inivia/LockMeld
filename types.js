import BN from "bn.js";
import params from './params.js';
const { zero } = params;

//二次型
class QuadraticForm {
  constructor(a, b, c, delt) {
    this.a = new BN(a);
    this.b = new BN(b);
    this.c = new BN(c);
    this. delt = new BN(delt);
  }
  static qfi(a, b, c) {
    const _a = new BN(a);
    const _b = new BN(b);
    const _c = new BN(c);
    const delt= _b.sqr().sub(_a.mul(_c).muln(4));
    return new QuadraticForm(_a,_b,_c,delt);
  }
  isLegal(){
    const _delt = this.b.sqr().sub(this.a.mul(this.c).muln(4));
    return _delt.eq(this.delt);
  }
  //类群乘法
  mul(other){
    const n = other.b.sub(this.b).divn(2);
    const res = bezout(other.a,this.a);
    const d = res.gcd;
    const y1 = res.x;
    let m;
    let v1 = this.a, v2 = other.a, c= other.c;
    if (d.eqn(1)) m=y1.mul(n);
    else {
      const s = other.b.sub(n);
      const { gcd: d1, x: x2, y: y2 } = bezout(s, d);
      if (!d1.eqn(1)){
        v1 = v1.div(d1);
        v2 = v2.div(d1);
        v1 = v1.mul(d1.gcd(n).gcd(c).gcd(this.c));
        c = c.mul(d1);
      }
      m = y1.mul(y2).mul(n).add(other.c.mul(x2));
    }
    m = m.neg();
    const r = m.mod(v1);
    const p1 = r.mul(v2);
    const c3 = c.add(r.mul(other.b.add(p1)));

    let resout = new QuadraticForm(
      v1.mul(v2),
      other.b.add(p1.muln(2)),
      c3.div(v1),
      this.delt
    );

    return resout.reduce();

  }

  //类群求幂
  pow(exponent){
    let result = this.mul(this.invert()); // 单位元
    let base = this;
    let exp = new BN(exponent);
    let count = 0;
    while (!exp.eqn(0)) {
      count++;
      //console.log("roop:",count);
      if (exp.isOdd()) {
        result = result.mul(base);
      }
      base = base.mul(base);
      exp = exp.divn(2);
    }
    
    return result;
  }
  //求逆
  invert(){
    return QuadraticForm.qfi(this.a,this.b.neg(),this.c);
  }
  //约化 
  reduce(){
    var count = 0;
     while (true) {
      const aPos = this.a.gt(0);
      const aLteC = this.a.lte(this.c);
      const bAbsLteA = this.b.abs().lte(this.a);
      const bGtNegA = this.b.gt(this.a.neg());
      //已是最简-a<b<=a<=c 如果a=c 则b>=0
      count++;
      //console.log(this);
      if (count>=100000) {console.log("ERROR:endless roop"); break;}
      if (aPos && bGtNegA && bAbsLteA && aLteC && (!this.a.eq(this.c) || !this.b.isNeg())) break;
      if (!bAbsLteA || (this.b.abs().eq(this.a) && this.b.isNeg())) {
        const twoA = this.a.muln(2);
        let q = this.b.div(twoA);
        let r = this.b.mod(twoA);
        if (r.gt(this.a)) { q = q.addn(1); r = r.sub(twoA); }
        else if (r.lte(this.a.neg())) { q = q.subn(1); r = r.add(twoA); }
        // 新 c = a*q² - b*q + c
        this.c = this.c.sub(q.mul(this.b)).add(this.a.mul(q.sqr()));
        this.b = r;
        continue;
    }
       //a>c 则交换ac b取负
      if (this.a.gt(this.c)) {
        [this.a, this.c] = [this.c, this.a];
        this.b = this.b.neg();
        continue;
      }
     }
     return this;
  }
}
//找到x y使得a*x+b*y = gcd(a,b)
function bezout(a,b) {
    // 处理特殊情况
    if (b.isZero()) {
      const absA = a.abs();
      return {
        gcd: absA,
        x: a.isNeg() ? new BN(-1) : new BN(1),
        y: new BN(0)
      };
    }
    
    // 确保 |a| >= |b|
    let swapped = false;
    if (a.abs().lt(b.abs())) {
      [a, b] = [b, a];
      swapped = true;
    }
    // [ u1 v1 ] = [0  1]
    let u = new BN(1), v = new BN(0);
    let u1 = new BN(0), v1 = new BN(1);
    
    let aCopy = a.clone();
    let bCopy = b.clone();
    
    // 主循环
    while (!bCopy.isZero()) {
      // a = q*b + r
      const q = aCopy.div(bCopy);
      const r = aCopy.mod(bCopy);
      
      // 更新系数
      const newU = u.sub(q.mul(u1));
      const newV = v.sub(q.mul(v1));
      
      u = u1;
      v = v1;
      u1 = newU;
      v1 = newV;
      
      // 更新 a, b
      aCopy = bCopy;
      bCopy = r;
    }
    
    // 确保 gcd 为正
    if (aCopy.isNeg()) {
      aCopy = aCopy.neg();
      u = u.neg();
      v = v.neg();
    }
    
    // 处理之前的交换
    if (swapped) {
      [u, v] = [v, u];
    }
    
    return {
      gcd: aCopy,
      x: u,
      y: v
    };
  
}



export default 
{ QuadraticForm, bezout,

};

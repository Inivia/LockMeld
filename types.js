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
    // 优化：如果 delt 已经计算过且匹配，直接返回
    // 注意：这里假设 delt 是正确的，实际验证需要重新计算
    // 为了性能，可以缓存计算结果
    const _delt = this.b.sqr().sub(this.a.mul(this.c).muln(4));
    return _delt.eq(this.delt);
  }
  //类群乘法
  mul(other){
    // 优化：减少中间变量创建，重用计算结果
    const n = other.b.sub(this.b).divn(2);
    const bezoutRes = bezout(other.a, this.a);
    const d = bezoutRes.gcd;
    const y1 = bezoutRes.x;
    
    let m;
    let v1 = this.a;
    let v2 = other.a;
    let c = other.c;
    
    if (d.eqn(1)) {
      // 优化：d=1 是常见情况，单独处理
      m = y1.mul(n);
    } else {
      const s = other.b.sub(n);
      const bezoutRes2 = bezout(s, d);
      const d1 = bezoutRes2.gcd;
      const x2 = bezoutRes2.x;
      const y2 = bezoutRes2.y;
      
      if (!d1.eqn(1)) {
        // 优化：合并多个 gcd 计算
        const gcdTemp = d1.gcd(n).gcd(c).gcd(this.c);
        v1 = v1.div(d1).mul(gcdTemp);
        v2 = v2.div(d1);
        c = c.mul(d1);
      }
      m = y1.mul(y2).mul(n).add(other.c.mul(x2));
    }
    
    m = m.neg();
    const r = m.mod(v1);
    const p1 = r.mul(v2);
    const c3 = c.add(r.mul(other.b.add(p1)));

    // 优化：直接创建并约化，避免中间变量
    const resout = new QuadraticForm(
      v1.mul(v2),
      other.b.add(p1.muln(2)),
      c3.div(v1),
      this.delt
    );

    return resout.reduce();
  }

  //类群求幂
  pow(exponent){
    // 优化：直接创建单位元，避免 mul(invert()) 的开销
    // 单位元是 (1, 0, -Delta/4) 的约化形式
    const unit = QuadraticForm.qfi(
      new BN(1),
      new BN(0),
      this.delt.neg().divn(4)
    );
    let result = unit;
    let base = this;
    let exp = new BN(exponent);
    
    // 处理负指数
    if (exp.isNeg()) {
      base = base.invert();
      exp = exp.neg();
    }
    
    // 快速幂算法
    while (!exp.eqn(0)) {
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
    const MAX_ITERATIONS = 100000;
    let count = 0;
    
    while (true) {
      count++;
      if (count >= MAX_ITERATIONS) {
        console.log("ERROR:endless loop in reduce()");
        break;
      }
      
      // 优化：直接访问属性，减少变量创建
      const a = this.a;
      const b = this.b;
      const c = this.c;
      
      // 快速检查：a 必须为正
      if (!a.gt(0)) {
        // 如果 a <= 0，需要特殊处理（这种情况应该很少见）
        break;
      }
      
      // 优化：缓存常用计算，避免重复调用
      const bAbs = b.abs();
      const aNeg = a.neg();
      const bAbsLteA = bAbs.lte(a);
      const bGtNegA = b.gt(aNeg);
      const aLteC = a.lte(c);
      
      // 检查是否已约化：-a < b <= a <= c，如果 a = c 则 b >= 0
      if (bGtNegA && bAbsLteA && aLteC) {
        // 如果 a = c，需要确保 b >= 0
        if (!a.eq(c) || !b.isNeg()) {
          break; // 已约化
        }
      }
      
      // 优化：先处理 b 的约化（更常见的情况）
      if (!bAbsLteA || (bAbs.eq(a) && b.isNeg())) {
        // 约化 b：找到 q 使得 |b - 2aq| <= a
        const twoA = a.muln(2);
        let q = b.div(twoA);
        let r = b.mod(twoA);
        
        // 调整余数到范围 [-a, a]
        if (r.gt(a)) {
          q = q.addn(1);
          r = r.sub(twoA);
        } else if (r.lte(aNeg)) {
          q = q.subn(1);
          r = r.add(twoA);
        }
        
        // 优化：减少中间计算
        // c' = c - b*q + a*q² = c - q*(b - a*q)
        const aq = a.mul(q);
        this.c = c.sub(q.mul(b.sub(aq)));
        this.b = r;
        continue;
      }
      
      // a > c 则交换 a 和 c，b 取负
      if (a.gt(c)) {
        this.a = c;
        this.c = a;
        this.b = b.neg();
        continue;
      }
      
      // 如果到这里还没 break，说明已经约化
      break;
    }
    
    return this;
  }
}
//找到x y使得a*x+b*y = gcd(a,b)
// 优化版本：减少不必要的克隆和计算
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
    
    // 优化：避免不必要的克隆，直接使用引用
    let aVal = a;
    let bVal = b;
    let swapped = false;
    
    // 确保 |a| >= |b|
    const aAbs = a.abs();
    const bAbs = b.abs();
    if (aAbs.lt(bAbs)) {
      [aVal, bVal] = [b, a];
      swapped = true;
    }
    
    // 扩展欧几里得算法
    // [ u  v  ] = [1  0]
    // [ u1 v1 ] = [0  1]
    let u = new BN(1), v = new BN(0);
    let u1 = new BN(0), v1 = new BN(1);
    
    // 优化：使用临时变量避免重复计算
    let r = aVal.clone();
    let s = bVal.clone();
    
    // 主循环
    while (!s.isZero()) {
      // r = q*s + t
      const q = r.div(s);
      const t = r.mod(s);
      
      // 更新系数：使用临时变量避免重复计算
      const tempU = u.sub(q.mul(u1));
      const tempV = v.sub(q.mul(v1));
      
      u = u1;
      v = v1;
      u1 = tempU;
      v1 = tempV;
      
      // 更新 r, s
      r = s;
      s = t;
    }
    
    // 确保 gcd 为正
    if (r.isNeg()) {
      r = r.neg();
      u = u.neg();
      v = v.neg();
    }
    
    // 处理之前的交换
    if (swapped) {
      [u, v] = [v, u];
    }
    
    return {
      gcd: r,
      x: u,
      y: v
    };
}



export default 
{ QuadraticForm, bezout,

};

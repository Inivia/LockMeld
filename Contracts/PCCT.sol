// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
import "./B12.sol";
pragma abicoder v2;
contract PCCT {
    using B12 for B12.G1Point;
    using B12 for B12.Fp;
    using B12_381Lib for B12.G1Point;
    //commitment of user account balance
    mapping(address => B12.G1Point) acc;

    function getAcc(address addr) public view returns (B12.G1Point memory) {
        return acc[addr];
    }
    function setAcc(address addr, B12.G1Point memory c)  public {
        acc[addr]=c;
    }

    function confidentialTX(address s_addr, address r_addr, B12.G1Point memory c ) public {
        B12.G1Point memory c_neg = c;
        B12.Fp memory p = B12.Fp(0x1ae3a4617c510eac63b05c06ca1493b, 0x1a22d9f300f5138f1ef3622fba094800170b5d44300000008508c00000000001);
        c_neg.Y = p.fpSub(c.Y);
        acc[s_addr]=acc[s_addr].g1Add(c_neg,0xF2, 15000);
        acc[r_addr]=c.g1Add(acc[r_addr],0xF2, 15000);
    }

    
}
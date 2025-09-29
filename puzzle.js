import {bls12_381, bls12_381_Fr} from "@noble/curves/bls12-381.js";
import { randomBytes, bytesToNumberBE } from '@noble/curves/utils.js';
import {mod, invert} from '@noble/curves/abstract/modular.js';
import crypto from 'crypto';
import BN from 'bn.js';
const { G1, G2, pairing ,fields} = bls12_381;
const Fp12 = fields.Fp12;
const Fr = bls12_381_Fr;
const order = Fr.ORDER;


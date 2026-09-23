import { describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { shake256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

describe('Three official multi-block known-answer tests', () => {
  it('NIST CAVP SHAKE256LongMsg.rsp, Len = 2184 bits', () => {
    const message = hexToBytes('dc5a100fa16df1583c79722a0d72833d3bf22c109b8889dbd35213c6bfce205813edae3242695cfd9f59b9a1c203c1b72ef1a5423147cb990b5316a85266675894e2644c3f9578cebe451a09e58c53788fe77a9e850943f8a275f830354b0593a762bac55e984db3e0661eca3cb83f67a6fb348e6177f7dee2df40c4322602f094953905681be3954fe44c4c902c8f6bba565a788b38f13411ba76ce0f9f6756a2a2687424c5435a51e62df7a8934b6e141f74c6ccf539e3782d22b5955d3baf1ab2cf7b5c3f74ec2f9447344e937957fd7f0bdfec56d5d25f61cde18c0986e244ecf780d6307e313117256948d4230ebb9ea62bb302cfe80d7dfebabc4a51d7687967ed5b416a139e974c005fff507a96');
    expect(message.length).toBe(273);
    expect(bytesToHex(shake256(message, { dkLen: 32 }))).toBe('2bac5716803a9cda8f9e84365ab0a681327b5ba34fdedfb1c12e6e807f45284b');
  });

  it('NIST CAVP SHAKE256VariableOut.rsp, COUNT = 675, 1096-bit output', () => {
    const message = hexToBytes('8d8001e2c096f1b88e7c9224a086efd4797fbf74a8033a2d422a2b6b8f6747e4');
    const expected = '2e975f6a8a14f0704d51b13667d8195c219f71e6345696c49fa4b9d08e9225d3d39393425152c97e71dd24601c11abcfa0f12f53c680bd3ae757b8134a9c10d429615869217fdd5885c4db174985703a6d6de94a667eac3023443a8337ae1bc601b76d7d38ec3c34463105f0d3949d78e562a039e4469548b609395de5a4fd43c46ca9fd6ee29ada5e';
    expect(bytesToHex(shake256(message, { dkLen: 137 }))).toBe(expected);
    const stream = shake256.create({ dkLen: 137 }).update(message);
    expect(bytesToHex(stream.xof(136)) + bytesToHex(stream.xof(1))).toBe(expected);
  });

  it('NIST SHA-256 example, 112-byte message spanning two blocks', () => {
    const message = new TextEncoder().encode('abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu');
    expect(message.length).toBe(112);
    expect(bytesToHex(sha256(message))).toBe('cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1');
  });
});
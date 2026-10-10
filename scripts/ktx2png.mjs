// Decode a Roblox-cached KTX2 (BC1/BC3, optional Zstd supercompression) to PNG.
import { readFileSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";
const [input, output] = process.argv.slice(2);
const b = readFileSync(input);
const vk = b.readUInt32LE(12), w = b.readUInt32LE(20), h = b.readUInt32LE(24), scheme = b.readUInt32LE(44);
const off = Number(b.readBigUInt64LE(80)), len = Number(b.readBigUInt64LE(88));
let data = b.subarray(off, off + len);
if (scheme === 2) data = zlib.zstdDecompressSync(data);
const rgba = Buffer.alloc(w * h * 4);
const c565 = (c) => [((c >> 11) & 31) * 255 / 31, ((c >> 5) & 63) * 255 / 63, (c & 31) * 255 / 31];
const bc1 = vk === 131 || vk === 132 || vk === 133 || vk === 134;
const bc3 = vk === 137 || vk === 138;
if (!bc1 && !bc3) throw new Error("unsupported vkFormat " + vk);
const blockSize = bc1 ? 8 : 16;
let p = 0;
for (let by = 0; by < Math.ceil(h / 4); by++) for (let bx = 0; bx < Math.ceil(w / 4); bx++, p += blockSize) {
  let alpha = null;
  let cb = p;
  if (bc3) {
    const a0 = data[p], a1 = data[p + 1];
    const pal = [a0, a1];
    if (a0 > a1) for (let i = 1; i < 7; i++) pal.push(((7 - i) * a0 + i * a1) / 7);
    else { for (let i = 1; i < 5; i++) pal.push(((5 - i) * a0 + i * a1) / 5); pal.push(0, 255); }
    let bits = 0n; for (let i = 0; i < 6; i++) bits |= BigInt(data[p + 2 + i]) << BigInt(8 * i);
    alpha = Array.from({ length: 16 }, (_, i) => pal[Number((bits >> BigInt(3 * i)) & 7n)]);
    cb = p + 8;
  }
  const c0 = data.readUInt16LE(cb), c1 = data.readUInt16LE(cb + 2), idx = data.readUInt32LE(cb + 4);
  const a = c565(c0), bb = c565(c1);
  const cols = c0 > c1 || bc3
    ? [a, bb, a.map((v, i) => (2 * v + bb[i]) / 3), a.map((v, i) => (v + 2 * bb[i]) / 3)]
    : [a, bb, a.map((v, i) => (v + bb[i]) / 2), [0, 0, 0]];
  for (let i = 0; i < 16; i++) {
    const x = bx * 4 + (i & 3), y = by * 4 + (i >> 2);
    if (x >= w || y >= h) continue;
    const k = (idx >> (2 * i)) & 3, o = (y * w + x) * 4;
    rgba[o] = cols[k][0]; rgba[o + 1] = cols[k][1]; rgba[o + 2] = cols[k][2];
    rgba[o + 3] = alpha ? alpha[i] : (!bc3 && c0 <= c1 && k === 3 && vk !== 131 ? 0 : 255);
  }
}
const raw = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, body) => { const t = Buffer.from(type); const out = Buffer.alloc(12 + body.length); out.writeUInt32BE(body.length); t.copy(out, 4); body.copy(out, 8); out.writeUInt32BE(crc(Buffer.concat([t, body])), 8 + body.length); return out; };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(output, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(input, "vk", vk, w + "x" + h);

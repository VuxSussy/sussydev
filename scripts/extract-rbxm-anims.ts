// Extract KeyframeSequence data from a binary .rbxm (Roblox model) into JSON clips
// that the web R6 rig can play. Usage:
//   node scripts/extract-rbxm-anims.ts "<path/to/file.rbxm>" [outDir=public/anims]
// Works without Roblox Studio: parses INST/PROP/PRNT chunks and LZ4 block compression.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Value = string | number | boolean | number[] | null;
type Instance = { ref: number; className: string; props: Record<string, Value>; parent: number; children: number[] };

function lz4(src: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size);
  let i = 0;
  let o = 0;
  while (i < src.length) {
    const token = src[i++];
    let literal = token >> 4;
    if (literal === 15) for (let b = 255; b === 255; ) { b = src[i++]; literal += b; }
    out.set(src.subarray(i, i + literal), o);
    i += literal;
    o += literal;
    if (i >= src.length) break;
    const offset = src[i] | (src[i + 1] << 8);
    i += 2;
    let match = token & 15;
    if (match === 15) for (let b = 255; b === 255; ) { b = src[i++]; match += b; }
    match += 4;
    for (let k = 0; k < match; k++, o++) out[o] = out[o - offset];
  }
  return out;
}

class Reader {
  pos = 0;
  buf: Uint8Array;
  view: DataView;
  constructor(buf: Uint8Array) { this.buf = buf; this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); }
  u8() { return this.buf[this.pos++]; }
  u32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  f32() { const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
  str() { const n = this.u32(); const s = new TextDecoder().decode(this.buf.subarray(this.pos, this.pos + n)); this.pos += n; return s; }
  // Interleaved big-endian 32-bit words, as used by ints, floats, enums and referents.
  words(count: number): number[] {
    const out = Array.from({ length: count }, (_, k) =>
      ((this.buf[this.pos + k] << 24) | (this.buf[this.pos + count + k] << 16) | (this.buf[this.pos + 2 * count + k] << 8) | this.buf[this.pos + 3 * count + k]) >>> 0);
    this.pos += count * 4;
    return out;
  }
  ints(count: number) { return this.words(count).map((w) => (w >>> 1) ^ -(w & 1)); }
  floats(count: number) {
    const scratch = new DataView(new ArrayBuffer(4));
    return this.words(count).map((w) => { scratch.setUint32(0, ((w >>> 1) | (w << 31)) >>> 0); return scratch.getFloat32(0); });
  }
  refs(count: number) { let acc = 0; return this.ints(count).map((d) => (acc += d)); }
}

// Basic rotation ids: stored = 6 * xAxis + yAxis + 1, axes in NormalId order (+X,+Y,+Z,-X,-Y,-Z).
const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]];
function basicRotation(id: number): number[] {
  const x = AXES[Math.floor((id - 1) / 6)];
  const y = AXES[(id - 1) % 6];
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [...x, ...y, ...z];
}

export function parseRbxm(file: Uint8Array): Map<number, Instance> {
  const head = new TextDecoder().decode(file.subarray(0, 8));
  if (head !== "<roblox!") throw new Error("Not a binary Roblox file");
  const instances = new Map<number, Instance>();
  const classes = new Map<number, { name: string; refs: number[] }>();
  let pos = 32;
  while (pos < file.length) {
    const name = new TextDecoder().decode(file.subarray(pos, pos + 4));
    const view = new DataView(file.buffer, file.byteOffset + pos + 4, 8);
    const compressed = view.getUint32(0, true);
    const size = view.getUint32(4, true);
    pos += 16;
    const raw = file.subarray(pos, pos + (compressed || size));
    pos += compressed || size;
    if (name === "END\0") break;
    if (compressed && raw[0] === 0x28 && raw[1] === 0xb5) throw new Error("zstd chunks are not supported");
    const r = new Reader(compressed ? lz4(raw, size) : raw);
    if (name === "INST") {
      const classId = r.u32();
      const className = r.str();
      r.u8();
      const refs = r.refs(r.u32());
      classes.set(classId, { name: className, refs });
      for (const ref of refs) instances.set(ref, { ref, className, props: {}, parent: -1, children: [] });
    } else if (name === "PROP") {
      const cls = classes.get(r.u32())!;
      const prop = r.str();
      const type = r.u8();
      const n = cls.refs.length;
      let values: Value[] | null = null;
      if (type === 0x01) values = cls.refs.map(() => r.str());
      else if (type === 0x02) values = cls.refs.map(() => r.u8() !== 0);
      else if (type === 0x03) values = r.ints(n);
      else if (type === 0x04) values = r.floats(n);
      else if (type === 0x12) values = r.words(n);
      else if (type === 0x13) values = r.refs(n);
      else if (type === 0x0e) { const x = r.floats(n), y = r.floats(n), z = r.floats(n); values = x.map((v, k) => [v, y[k], z[k]]); }
      else if (type === 0x10) {
        const rots = cls.refs.map(() => { const id = r.u8(); return id === 0 ? Array.from({ length: 9 }, () => r.f32()) : basicRotation(id); });
        const x = r.floats(n), y = r.floats(n), z = r.floats(n);
        values = rots.map((rot, k) => [x[k], y[k], z[k], ...rot]);
      }
      if (values) cls.refs.forEach((ref, k) => { instances.get(ref)!.props[prop] = values![k]; });
    } else if (name === "PRNT") {
      r.u8();
      const n = r.u32();
      const children = r.refs(n);
      const parents = r.refs(n);
      children.forEach((child, k) => {
        const inst = instances.get(child);
        if (!inst) return;
        inst.parent = parents[k];
        instances.get(parents[k])?.children.push(child);
      });
    }
  }
  return instances;
}

// Roblox CFrame components (x,y,z,R00..R22) -> position + quaternion [x,y,z,w].
function toPosQuat(c: number[]) {
  const [x, y, z, m00, m01, m02, m10, m11, m12, m20, m21, m22] = c;
  const trace = m00 + m11 + m22;
  let q: number[];
  if (trace > 0) { const s = 0.5 / Math.sqrt(trace + 1); q = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  const round = (v: number) => Math.round(v * 1e5) / 1e5;
  return { p: [x, y, z].map(round), q: q.map(round) };
}

const EASING_STYLE = ["Linear", "Constant", "Elastic", "Cubic", "Bounce", "CubicV2"];
const EASING_DIRECTION = ["In", "Out", "InOut"];

export function extractClips(instances: Map<number, Instance>) {
  const clips = [];
  for (const seq of instances.values()) {
    if (seq.className !== "KeyframeSequence") continue;
    const keyframes = [];
    const markers: { t: number; name: string }[] = [];
    for (const kfRef of seq.children) {
      const kf = instances.get(kfRef)!;
      if (kf.className !== "Keyframe") continue;
      const t = kf.props.Time as number;
      const poses: Record<string, unknown> = {};
      const walk = (ref: number) => {
        const node = instances.get(ref)!;
        if (node.className === "KeyframeMarker") markers.push({ t, name: String(node.props.Name) });
        if (node.className !== "Pose") return;
        if ((node.props.Weight as number) > 0 && node.props.Name !== "HumanoidRootPart") {
          poses[String(node.props.Name)] = {
            ...toPosQuat(node.props.CFrame as number[]),
            e: EASING_STYLE[node.props.EasingStyle as number] ?? "Linear",
            d: EASING_DIRECTION[node.props.EasingDirection as number] ?? "In",
          };
        }
        node.children.forEach(walk);
      };
      kf.children.forEach(walk);
      keyframes.push({ t: Math.round(t * 1e4) / 1e4, poses });
    }
    keyframes.sort((a, b) => a.t - b.t);
    clips.push({
      name: String(seq.props.Name),
      loop: Boolean(seq.props.Loop),
      duration: keyframes.at(-1)?.t ?? 0,
      keyframes,
      markers: markers.sort((a, b) => a.t - b.t),
    });
  }
  return clips;
}

export function extractMotors(instances: Map<number, Instance>) {
  const motors: Record<string, { part0: string; part1: string; c0: number[]; c1: number[] }> = {};
  for (const m of instances.values()) {
    if (m.className !== "Motor6D") continue;
    const owner = instances.get(m.parent);
    if (!owner || instances.get(owner.parent)?.props.Name !== "Dummy") continue;
    const part0 = instances.get(m.props.Part0 as number);
    const part1 = instances.get(m.props.Part1 as number);
    motors[String(m.props.Name)] = {
      part0: String(part0?.props.Name ?? owner.props.Name),
      part1: String(part1?.props.Name ?? ""),
      c0: m.props.C0 as number[],
      c1: m.props.C1 as number[],
    };
  }
  return motors;
}

const isMain = process.argv[1]?.endsWith("extract-rbxm-anims.ts");
if (isMain) {
  const [input, outDir = "public/anims"] = process.argv.slice(2);
  if (!input) { console.error("Usage: node scripts/extract-rbxm-anims.ts <file.rbxm> [outDir]"); process.exit(1); }
  const instances = parseRbxm(new Uint8Array(readFileSync(input)));
  const clips = extractClips(instances);
  mkdirSync(outDir, { recursive: true });
  const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const index = clips.map((clip) => {
    const file = `${slug(clip.name)}.json`;
    writeFileSync(join(outDir, file), JSON.stringify(clip));
    return { name: clip.name, file, loop: clip.loop, duration: clip.duration, keyframes: clip.keyframes.length };
  });
  writeFileSync(join(outDir, "index.json"), JSON.stringify({ rig: "R6", motors: extractMotors(instances), clips: index }, null, 2));
  console.log(`Extracted ${clips.length} clips to ${outDir}`);
  for (const c of index) console.log(`  ${c.name.padEnd(16)} ${String(c.keyframes).padStart(4)} kf  ${c.duration.toFixed(2)}s ${c.loop ? "loop" : ""}`);
}

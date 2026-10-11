// Convert Roblox .mesh (v2-v5 binary, v6/v7 chunked incl. Draco COREMESH) to JSON {position,normal,uv,index}.
import { readFileSync, writeFileSync } from "node:fs";
import draco3d from "draco3d";

const [input, output] = process.argv.slice(2);
const buf = readFileSync(input);
const nl = buf.indexOf(10);
const version = buf.subarray(0, nl).toString().trim();
let pos = nl + 1;
const out = { version, position: [], normal: [], uv: [], color: [], index: [] };

function readVerts(off, count, stride) {
  for (let i = 0; i < count; i++) {
    const b = off + i * stride;
    for (let k = 0; k < 3; k++) out.position.push(buf.readFloatLE(b + k * 4));
    for (let k = 0; k < 3; k++) out.normal.push(buf.readFloatLE(b + 12 + k * 4));
    out.uv.push(buf.readFloatLE(b + 24), buf.readFloatLE(b + 28));
    if (stride >= 40) out.color.push(buf.readUInt8(b + 36), buf.readUInt8(b + 37), buf.readUInt8(b + 38), buf.readUInt8(b + 39));
  }
}
function readFaces(off, count) { for (let i = 0; i < count * 3; i++) out.index.push(buf.readUInt32LE(off + i * 4)); }

if (/version [2345]\./.test(version)) {
  const headerSize = buf.readUInt16LE(pos);
  const vsize = buf.readUInt8(pos + 2);
  let numVerts, numFaces, numLODs = 0;
  if (version.startsWith("version 2")) { numVerts = buf.readUInt32LE(pos + 4); numFaces = buf.readUInt32LE(pos + 8); }
  else if (version.startsWith("version 3")) { numLODs = buf.readUInt16LE(pos + 6); numVerts = buf.readUInt32LE(pos + 8); numFaces = buf.readUInt32LE(pos + 12); }
  else { numVerts = buf.readUInt32LE(pos + 4); numFaces = buf.readUInt32LE(pos + 8); numLODs = buf.readUInt16LE(pos + 12); }
  const numBones = version.startsWith("version 2") || version.startsWith("version 3") ? 0 : buf.readUInt16LE(pos + 14);
  pos += headerSize;
  readVerts(pos, numVerts, vsize);
  pos += numVerts * vsize;
  if (numBones) pos += numVerts * 8;
  const lodOffsetsAt = pos + numFaces * 12;
  let faceCount = numFaces;
  if (numLODs > 1) faceCount = buf.readUInt32LE(lodOffsetsAt + 4) - buf.readUInt32LE(lodOffsetsAt);
  readFaces(pos, faceCount);
} else {
  const decoderModule = await draco3d.createDecoderModule({});
  // Faces of every LOD follow each other in COREMESH; the LODS chunk gives where each level starts. Keep LOD0 only,
  // or the coarser levels render on top of it (the "two scarves" look, with z-fighting patches).
  let lod0Faces = Infinity;
  while (pos < buf.length) {
    const name = buf.subarray(pos, pos + 8).toString().replaceAll("\u0000", "");
    const cver = buf.readUInt32LE(pos + 8);
    const size = buf.readUInt32LE(pos + 12);
    const data = buf.subarray(pos + 16, pos + 16 + size);
    pos += 16 + size;
    if (name === "LODS") {
      const count = data.readUInt32LE(3);
      if (count > 1) lod0Faces = data.readUInt32LE(7 + 4) - data.readUInt32LE(7);
      continue;
    }
    if (name !== "COREMESH") continue;
    if (cver === 1) {
      const nv = data.readUInt32LE(0);
      const base = data.byteOffset + 4;
      const view = buf.subarray(base, base + nv * 40);
      readVerts(base - buf.byteOffset + buf.byteOffset, 0, 40);
      for (let i = 0; i < nv; i++) {
        const b = 4 + i * 40;
        for (let k = 0; k < 3; k++) out.position.push(data.readFloatLE(b + k * 4));
        for (let k = 0; k < 3; k++) out.normal.push(data.readFloatLE(b + 12 + k * 4));
        out.uv.push(data.readFloatLE(b + 24), data.readFloatLE(b + 28));
      }
      const nf = data.readUInt32LE(4 + nv * 40);
      for (let i = 0; i < nf * 3; i++) out.index.push(data.readUInt32LE(8 + nv * 40 + i * 4));
      void view;
    } else {
      const dracoSize = data.readUInt32LE(0);
      const bytes = new Int8Array(data.buffer, data.byteOffset + 4, dracoSize);
      const decoder = new decoderModule.Decoder();
      const mesh = new decoderModule.Mesh();
      const status = decoder.DecodeArrayToMesh(bytes, bytes.length, mesh);
      if (!status.ok()) throw new Error(status.error_msg());
      const n = mesh.num_points();
      const read = (type, comps) => {
        const id = decoder.GetAttributeId(mesh, type);
        if (id < 0) return null;
        const attr = decoder.GetAttribute(mesh, id);
        const arr = new decoderModule.DracoFloat32Array();
        decoder.GetAttributeFloatForAllPoints(mesh, attr, arr);
        const res = Array.from({ length: n * comps }, (_, i) => arr.GetValue(i));
        decoderModule.destroy(arr);
        return res;
      };
      const readGeneric = (comps) => {
        for (let i = 0; i < mesh.num_attributes(); i++) {
          const attr = decoder.GetAttribute(mesh, i);
          if (attr.attribute_type() !== decoderModule.GENERIC || attr.num_components() !== comps) continue;
          const arr = new decoderModule.DracoFloat32Array();
          decoder.GetAttributeFloatForAllPoints(mesh, attr, arr);
          const res = Array.from({ length: n * comps }, (_, k) => arr.GetValue(k));
          decoderModule.destroy(arr);
          return res;
        }
        return null;
      };
      out.position = read(decoderModule.POSITION, 3);
      // Roblox v7 meshes store normals (and tangents) as GENERIC attributes: the 3-component one is the normal.
      out.normal = read(decoderModule.NORMAL, 3) ?? readGeneric(3) ?? [];
      out.uv = read(decoderModule.TEX_COORD, 2) ?? [];
      const faces = new decoderModule.DracoUInt32Array();
      for (let f = 0; f < mesh.num_faces(); f++) {
        decoder.GetFaceFromMesh(mesh, f, faces);
        out.index.push(faces.GetValue(0), faces.GetValue(1), faces.GetValue(2));
      }
      decoderModule.destroy(faces);
    }
  }
  if (out.index.length > lod0Faces * 3) out.index.length = lod0Faces * 3;
}
writeFileSync(output, JSON.stringify(out));
const xs = out.position.filter((_, i) => i % 3 === 0), ys = out.position.filter((_, i) => i % 3 === 1), zs = out.position.filter((_, i) => i % 3 === 2);
console.log(version, "verts", out.position.length / 3, "tris", out.index.length / 3, "bbox", [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)].map((v) => v.toFixed(3)).join(" "));

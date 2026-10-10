import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { extractClips, extractMotors, parseRbxm } from "../scripts/extract-rbxm-anims";

const fixture = readFileSync(new URL("./fixtures/r6-movement.rbxm", import.meta.url));
const instances = parseRbxm(fixture);
const clips = extractClips(instances);
const index = JSON.parse(readFileSync(new URL("../public/anims/index.json", import.meta.url), "utf8"));
// Compare the JSON boundary: JSON.stringify intentionally serializes -0 as 0.
const published = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("bundled RBXM regression", () => {
  it("matches all sequence metadata and Motor6D frames in the published index", () => {
    expect(published(extractMotors(instances))).toEqual(index.motors);
    expect(clips.map((c) => ({ name: c.name, loop: c.loop, duration: c.duration, keyframes: c.keyframes.length }))).toEqual(index.clips.map(({ file: _file, ...clip }: { file: string }) => clip));
  });

  it.each(["run-v4", "idle-v2", "walk-v3", "jump", "normal-land", "fall"])("matches every pose and marker of %s", (file) => {
    const expected = JSON.parse(readFileSync(new URL(`../public/anims/${file}.json`, import.meta.url), "utf8"));
    expect(published(clips.find((c) => c.name === expected.name))).toEqual(expected);
  });

  it("preserves parent/child links and ignores non-animation instances", () => {
    expect(instances.size).toBe(6683);
    expect(clips).toHaveLength(15);
    for (const instance of instances.values()) {
      if (instance.parent >= 0) expect(instances.get(instance.parent)?.children).toContain(instance.ref);
    }
  });

  it("runs the CLI into a fresh output directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "sussy-anims-"));
    try {
      execFileSync(process.execPath, ["scripts/extract-rbxm-anims.ts", "tests/fixtures/r6-movement.rbxm", dir]);
      expect(JSON.parse(readFileSync(join(dir, "index.json"), "utf8"))).toEqual(index);
      expect(JSON.parse(readFileSync(join(dir, "run-v4.json"), "utf8"))).toEqual(published(clips.find((c) => c.name === "run v4")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("invalid input", () => {
  it("rejects text, truncated headers, chunk payloads and chunk headers", () => {
    expect(() => parseRbxm(new TextEncoder().encode("<roblox>XML</roblox>"))).toThrow("Not a binary Roblox file");
    expect(() => parseRbxm(fixture.subarray(0, 8))).toThrow("Truncated RBXM header");
    expect(() => parseRbxm(fixture.subarray(0, 40))).toThrow("Truncated RBXM chunk header");
    expect(() => parseRbxm(fixture.subarray(0, 50))).toThrow("Truncated RBXM chunk");
  });

  const compressedChunk = (bytes: number[], size: number) => {
    const file = Buffer.alloc(48 + bytes.length);
    fixture.copy(file, 0, 0, 32);
    file.write("INST", 32);
    file.writeUInt32LE(bytes.length, 36);
    file.writeUInt32LE(size, 40);
    file.set(bytes, 48);
    return file;
  };

  it("rejects unsupported zstd compression explicitly", () => {
    expect(() => parseRbxm(compressedChunk([0x28, 0xb5, 0x2f, 0xfd], 10))).toThrow("zstd chunks are not supported");
  });

  it.each([
    [[0xf0], 15, "Truncated LZ4 block"],
    [[0x20, 1], 2, "Invalid LZ4 literal length"],
    [[0, 0, 0], 4, "Invalid LZ4 match offset"],
    [[0x10, 1, 1, 0], 2, "Invalid LZ4 match length"],
    [[0x10, 1], 2, "LZ4 size mismatch"],
  ] as const)("rejects corrupt LZ4 block %j", (bytes, size, message) => {
    expect(() => parseRbxm(compressedChunk([...bytes], size))).toThrow(message);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildR6Rig, cframeToMatrix, clipFromJson, createSitClip, jointNode, poseSampler, R6_JOINTS, type ClipJson, type Motor } from "../lib/rbx/rig";

const index = JSON.parse(readFileSync(new URL("../public/anims/index.json", import.meta.url), "utf8")) as { motors: Record<string, Motor> };
const files = ["run-v4", "idle-v2", "walk-v3", "jump", "normal-land", "fall", "wave"];
const readClip = (file: string): ClipJson => JSON.parse(readFileSync(new URL(`../public/anims/${file}.json`, import.meta.url), "utf8"));
const closeMatrix = (actual: THREE.Matrix4, expected: THREE.Matrix4) => actual.elements.forEach((v, i) => expect(v).toBeCloseTo(expected.elements[i], 5));

describe("R6 rig", () => {
  it("maps Roblox row-major rotation and translation to world coordinates", () => {
    const m = cframeToMatrix([2, 3, 4, 0, 0, 1, 0, 1, 0, -1, 0, 0]);
    expect(new THREE.Vector3(1, 0, 0).applyMatrix4(m).toArray()).toEqual([2, 3, 3]);
    expect(jointNode("Right Arm")).toBe("RightArmJoint");
  });

  it("satisfies Part1 = Part0 * C0 * Transform * inverse(C1) and preserves meshopt transforms", () => {
    const source = new THREE.Group();
    for (const { part } of R6_JOINTS) {
      const mesh = new THREE.Object3D();
      mesh.name = part.replaceAll(" ", "");
      mesh.position.set(0.2, 0.3, 0.4);
      mesh.scale.set(0.5, 0.6, 0.7);
      source.add(mesh);
    }
    const rig = buildR6Rig(source, index.motors);
    rig.root.position.y = 3;
    rig.joints.Torso.rotation.y = 0.4;
    rig.joints["Right Arm"].position.set(0.1, -0.2, 0.3);
    rig.joints["Right Arm"].rotation.z = 0.7;
    rig.root.updateMatrixWorld(true);
    for (const { part, motor, parent } of R6_JOINTS) {
      const frame = parent ? rig.parts[parent] : rig.root;
      const m = index.motors[motor];
      const expected = frame.matrixWorld.clone().multiply(cframeToMatrix(m.c0)).multiply(rig.joints[part].matrix).multiply(cframeToMatrix(m.c1).invert());
      closeMatrix(rig.parts[part].matrixWorld, expected);
      expect(rig.parts[part].getObjectByName(jointNode(part).replace("Joint", ""))?.position.toArray()).toEqual([0.2, 0.3, 0.4]);
      expect(rig.parts[part].children[0].scale.toArray()).toEqual([0.5, 0.6, 0.7]);
    }
    expect(source.children).toHaveLength(0);
  });

  it("builds a usable rig without meshes and places the rest pose correctly", () => {
    const rig = buildR6Rig(new THREE.Group(), index.motors);
    rig.root.position.y = 3;
    rig.root.updateMatrixWorld(true);
    expect(rig.parts.Head.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(4.5);
    expect(rig.parts["Left Leg"].getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(1);
    expect(rig.parts["Right Arm"].getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(1.5);
  });
});

describe("animation clips", () => {
  it.each(files)("plays the bundled %s clip on the joint nodes", (file) => {
    const json = readClip(file);
    const clip = clipFromJson(json);
    expect(clip.name).toBe(json.name);
    expect(clip.duration).toBe(json.duration);
    expect(clip.validate()).toBe(true);
    expect(clip.tracks).toHaveLength(12);
    const rig = buildR6Rig(new THREE.Group(), index.motors);
    const mixer = new THREE.AnimationMixer(rig.root);
    mixer.clipAction(clip).play();
    const kf = json.keyframes[Math.floor(json.keyframes.length / 2)];
    mixer.setTime(kf.t);
    for (const { part } of R6_JOINTS) {
      const pose = kf.poses[part];
      if (!pose) continue;
      rig.joints[part].position.toArray().forEach((v, i) => expect(v).toBeCloseTo(pose.p[i], 4));
      const actual = rig.joints[part].quaternion;
      const expected = new THREE.Quaternion().fromArray(pose.q);
      expect(Math.abs(actual.dot(expected))).toBeCloseTo(1, 4);
    }
  });

  it("resets unkeyed joints to identity and skips missing poses", () => {
    const clip = clipFromJson({ name: "sparse", loop: false, duration: 1, markers: [], keyframes: [
      { t: 0, poses: {} }, { t: 1, poses: { Torso: { p: [1, 2, 3], q: [0, 0, 0, 1], e: "Linear", d: "In" } } },
    ] });
    expect(Array.from(clip.tracks[0].times)).toEqual([1]);
    expect(Array.from(clip.tracks[2].values)).toEqual([0, 0, 0, 1]);
    expect(Array.from(clip.tracks[3].values)).toEqual([0, 0, 0]);
    expect(clip.validate()).toBe(true);
  });

  it("closes the seated breathing loop without a pose discontinuity", () => {
    const clip = createSitClip();
    expect(clip.validate()).toBe(true);
    expect(clip.tracks).toHaveLength(12);
    for (const track of clip.tracks.filter((t) => t instanceof THREE.QuaternionKeyframeTrack)) {
      expect(Array.from(track.values.slice(0, 4))).toEqual(Array.from(track.values.slice(-4)));
    }
  });

  it("plays the Roblox R6 wave emote: right arm raised high mid-wave, back at rest at the end", () => {
    const rig = buildR6Rig(new THREE.Group(), index.motors);
    rig.root.position.y = 3;
    const wave = poseSampler(clipFromJson(readClip("wave")));
    expect(wave.duration).toBeCloseTo(1.5);
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const armY = (t: number) => {
      for (const [part, joint] of Object.entries(rig.joints)) {
        if (wave.sample(jointNode(part), t, q, p)) { joint.quaternion.copy(q); joint.position.copy(p); }
      }
      rig.root.updateMatrixWorld(true);
      return rig.parts["Right Arm"].getWorldPosition(new THREE.Vector3()).y;
    };
    expect(armY(0)).toBeCloseTo(3, 3);
    expect(armY(0.6)).toBeGreaterThan(4.4); // above the shoulder (3.5): the arm points up
    expect(armY(wave.duration)).toBeCloseTo(3, 1); // the clip ends with a hair of torso sway
  });
});

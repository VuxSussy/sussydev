import * as THREE from "three";

/** Motor6D data extracted from the .rbxm (CFrame components: x,y,z,R00..R22). */
export type Motor = { part0: string; part1: string; c0: number[]; c1: number[] };
export type PoseJson = { p: number[]; q: number[]; e: string; d: string };
export type ClipJson = {
  name: string;
  loop: boolean;
  duration: number;
  keyframes: { t: number; poses: Record<string, PoseJson> }[];
  markers: { t: number; name: string }[];
};

/** R6 joint tree. Part names match Roblox Pose names; GLB meshes use the space-less variant. */
export const R6_JOINTS = [
  { motor: "Root Hip", part: "Torso", parent: null },
  { motor: "Neck", part: "Head", parent: "Torso" },
  { motor: "Right Shoulder", part: "Right Arm", parent: "Torso" },
  { motor: "Left Shoulder", part: "Left Arm", parent: "Torso" },
  { motor: "Right Hip", part: "Right Leg", parent: "Torso" },
  { motor: "Left Hip", part: "Left Leg", parent: "Torso" },
] as const;

export type R6Part = (typeof R6_JOINTS)[number]["part"];

/** Name of the animated node for a part; it carries Motor6D.Transform. */
export const jointNode = (part: string) => `${part.replace(/\s+/g, "")}Joint`;
const meshName = (part: string) => part.replace(/\s+/g, "");

/** Roblox CFrame components to a Matrix4. Roblox and three.js share Y-up right-handed axes. */
export function cframeToMatrix(c: number[]) {
  return new THREE.Matrix4().set(c[3], c[4], c[5], c[0], c[6], c[7], c[8], c[1], c[9], c[10], c[11], c[2], 0, 0, 0, 1);
}

function applyMatrix(object: THREE.Object3D, matrix: THREE.Matrix4) {
  matrix.decompose(object.position, object.quaternion, object.scale);
}

export type R6Rig = {
  /** HumanoidRootPart frame. Place it 3 studs above the ground for a standing character. */
  root: THREE.Group;
  joints: Record<R6Part, THREE.Object3D>;
  parts: Record<R6Part, THREE.Object3D>;
};

/**
 * Build Part1 = Part0 * C0 * Transform * C1^-1 as a node chain:
 * parentPart -> C0 node -> Transform node (animated) -> C1^-1 node (part frame, holds the mesh).
 */
export function buildR6Rig(source: THREE.Object3D, motors: Record<string, Motor>): R6Rig {
  const root = new THREE.Group();
  root.name = "HumanoidRootPart";
  const joints = {} as Record<R6Part, THREE.Object3D>;
  const parts = {} as Record<R6Part, THREE.Object3D>;
  for (const joint of R6_JOINTS) {
    const motor = motors[joint.motor];
    const parentFrame = joint.parent ? parts[joint.parent] : root;
    const c0 = new THREE.Object3D();
    applyMatrix(c0, cframeToMatrix(motor.c0));
    const transform = new THREE.Object3D();
    transform.name = jointNode(joint.part);
    const partFrame = new THREE.Object3D();
    partFrame.name = `${meshName(joint.part)}Frame`;
    applyMatrix(partFrame, cframeToMatrix(motor.c1).invert());
    parentFrame.add(c0);
    c0.add(transform);
    transform.add(partFrame);
    // Meshes are authored in part space; any node transform left on them is meshopt dequantization.
    const mesh = source.getObjectByName(meshName(joint.part));
    if (mesh) partFrame.add(mesh);
    joints[joint.part] = transform;
    parts[joint.part] = partFrame;
  }
  return { root, joints, parts };
}

/** Convert an extracted KeyframeSequence into an AnimationClip on the rig's joint nodes. */
export function clipFromJson(json: ClipJson): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  for (const { part } of R6_JOINTS) {
    const times: number[] = [];
    const quats: number[] = [];
    const positions: number[] = [];
    for (const kf of json.keyframes) {
      const pose = kf.poses[part];
      if (!pose) continue;
      times.push(kf.t);
      quats.push(...pose.q);
      positions.push(...pose.p);
    }
    if (!times.length) {
      times.push(0);
      quats.push(0, 0, 0, 1);
      positions.push(0, 0, 0);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${jointNode(part)}.quaternion`, times, quats));
    tracks.push(new THREE.VectorKeyframeTrack(`${jointNode(part)}.position`, times, positions));
  }
  return new THREE.AnimationClip(json.name, json.duration, tracks);
}

/*
 * Joint frames (from the Motor6D C0s; the character faces -Z):
 *   Root / Neck   X = pitch (negative leans back / looks up), Y = roll (positive tilts to the character's left),
 *                 Z = yaw.
 *   Shoulders     Z = swing forward (right +, left -), X = raise sideways (negative lifts the arm outwards on
 *                 both sides).
 *   Hips          same as the shoulders.
 * `limb(forward, out)` = Rz(forward) * Rx(-out): spread the limb out to the side first, then swing it forward.
 */
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const tmpA = new THREE.Quaternion();
const tmpB = new THREE.Quaternion();

function limb(forward: number, out: number, target = new THREE.Quaternion()) {
  return target.setFromAxisAngle(AXIS_Z, forward).multiply(tmpA.setFromAxisAngle(AXIS_X, -out));
}

/** Yaw * pitch * roll for the root and neck joints. */
function spine(pitch: number, roll = 0, yaw = 0) {
  return new THREE.Quaternion()
    .setFromAxisAngle(AXIS_Z, yaw)
    .multiply(tmpA.setFromAxisAngle(AXIS_X, pitch))
    .multiply(tmpB.setFromAxisAngle(AXIS_Y, roll));
}

/**
 * A relaxed seated pose (the pack has none), loosely after a character resting against a tree: leaning back a
 * little, legs forward and slightly apart (not mirror-perfect), hands resting on the thighs. An 8 s loop adds
 * breathing, and the head tilts and glances aside once before settling back on the viewer.
 */
export function createSitClip(): THREE.AnimationClip {
  const times = [0, 1.6, 2.6, 4, 5.4, 6.6, 8];
  const breath = [0, 1, 0.2, 1, 0.1, 0.9, 0];
  const track = (part: string, frames: THREE.Quaternion[]) =>
    new THREE.QuaternionKeyframeTrack(`${jointNode(part)}.quaternion`, times, frames.flatMap((q) => q.toArray()));
  const still = (part: string) => new THREE.VectorKeyframeTrack(`${jointNode(part)}.position`, [0], [0, 0, 0]);
  // Head: turned back towards the viewer (the body faces the sunset), glances at the sunset, comes back.
  // Negative yaw turns the face towards the character's right.
  const headYaw = [-0.22, -0.2, 0.14, 0.18, -0.16, -0.22, -0.22];
  const headRoll = [0.06, 0.1, 0.02, 0, -0.04, 0.05, 0.06];
  return new THREE.AnimationClip("sit", 8, [
    track("Torso", breath.map((b) => spine(-0.2 - 0.018 * b))),
    track("Head", breath.map((b, i) => spine(0.04 + 0.03 * b, headRoll[i], headYaw[i]))),
    track("Right Arm", breath.map((b) => limb(0.62 + 0.03 * b, -0.2))),
    track("Left Arm", breath.map((b) => limb(-(0.58 + 0.03 * b), -0.17))),
    track("Right Leg", breath.map(() => limb(Math.PI / 2 + 0.03, 0.1))),
    track("Left Leg", breath.map(() => limb(-(Math.PI / 2 - 0.07), 0.15))),
    ...R6_JOINTS.map(({ part }) => still(part)),
  ]);
}

/**
 * Per-joint pose sampler for a clip, used to layer an emote over whatever the mixer produced (like a Roblox
 * AnimationTrack at Action priority): `sample(t)` evaluates every joint track of the clip at time `t`.
 */
export function poseSampler(clip: THREE.AnimationClip) {
  const joints = new Map<string, { q?: THREE.Interpolant; p?: THREE.Interpolant }>();
  for (const track of clip.tracks) {
    const [node, property] = track.name.split(".");
    const entry = joints.get(node) ?? {};
    if (property === "quaternion") entry.q = new THREE.QuaternionLinearInterpolant(track.times, track.values, 4, new Float32Array(4));
    else if (property === "position") entry.p = new THREE.LinearInterpolant(track.times, track.values, 3, new Float32Array(3));
    joints.set(node, entry);
  }
  return {
    duration: clip.duration,
    joints,
    /** Writes the pose of `node` at time `t` into `q` / `p`; returns false when the clip has no track for it. */
    sample(node: string, t: number, q: THREE.Quaternion, p: THREE.Vector3) {
      const entry = joints.get(node);
      if (!entry) return false;
      if (entry.q) q.fromArray(entry.q.evaluate(t) as unknown as number[]);
      if (entry.p) p.fromArray(entry.p.evaluate(t) as unknown as number[]);
      return true;
    },
  };
}

/** Fade weight of a one-shot emote: Roblox-style 0.15 s fade in and out around its duration. */
export function emoteWeight(t: number, duration: number, fade = 0.15) {
  if (t < 0 || t > duration) return 0;
  return Math.min(1, t / fade, (duration - t) / fade);
}

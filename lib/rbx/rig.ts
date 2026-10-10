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
    const mesh = source.getObjectByName(meshName(joint.part));
    if (mesh) {
      mesh.position.set(0, 0, 0);
      mesh.quaternion.identity();
      partFrame.add(mesh);
    }
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

/** A seated pose (the pack has none): legs forward, hands resting on the knees, gentle breathing. */
export function createSitClip(): THREE.AnimationClip {
  const z = new THREE.Vector3(0, 0, 1);
  const x = new THREE.Vector3(1, 0, 0);
  const q = (axis: THREE.Vector3, angle: number) => new THREE.Quaternion().setFromAxisAngle(axis, angle).toArray();
  const times = [0, 1.8, 3.6];
  const track = (part: string, frames: number[][]) =>
    new THREE.QuaternionKeyframeTrack(`${jointNode(part)}.quaternion`, times, frames.flat());
  const still = (part: string) => new THREE.VectorKeyframeTrack(`${jointNode(part)}.position`, [0], [0, 0, 0]);
  return new THREE.AnimationClip("sit", 3.6, [
    track("Torso", [q(x, -0.1), q(x, -0.135), q(x, -0.1)]),
    track("Head", [q(x, -0.16), q(x, -0.2), q(x, -0.16)]),
    track("Right Arm", [q(z, 1.0), q(z, 0.98), q(z, 1.0)]),
    track("Left Arm", [q(z, -1.0), q(z, -0.98), q(z, -1.0)]),
    track("Right Leg", [q(z, Math.PI / 2), q(z, Math.PI / 2), q(z, Math.PI / 2)]),
    track("Left Leg", [q(z, -Math.PI / 2), q(z, -Math.PI / 2), q(z, -Math.PI / 2)]),
    ...R6_JOINTS.map(({ part }) => still(part)),
  ]);
}

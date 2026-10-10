import { expect, it, vi } from "vitest";
import * as THREE from "three";
import { disposeObjects } from "../components/story/scene/dispose";

it("releases shared geometry, material arrays and textures once across scene and late-load roots", () => {
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
  const geometry = new THREE.BoxGeometry();
  const other = new THREE.MeshBasicMaterial({ map: texture });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geometry, [material, other]), new THREE.Mesh(geometry, material));
  const pending = new THREE.Mesh(geometry, material);
  const spies = [texture, material, geometry, other].map((resource) => vi.spyOn(resource, "dispose"));
  disposeObjects(root, pending);
  spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
});

import type { CodeWorkspaceProvisioner } from './code-workspace.provisioner.js';

/** Where the seed tars are bind-mounted in a dind container — what its boot script loads from. */
export const SEED_IMAGES_MOUNT = '/opt/loopstack/seed-images';

/**
 * Export the host images a dind container loads on boot, and return the read-only bind that exposes them.
 *
 * Done at the container, which is the only place that knows what it needs and the only moment the host images
 * are known to be current: a tar is compared against the host image's id, so a rebuilt image re-exports and
 * an unchanged one costs an inspect. The store is global — a tar of an image is the same tar whoever asked
 * for it — so it belongs to no base and no workspace.
 *
 * A missing or unreadable image is fatal: the container would boot without the image it was given a daemon
 * for, and discover it at the point where it tries to use it.
 */
export async function bindSeedImages(
  workspace: CodeWorkspaceProvisioner,
  images: readonly string[] | undefined,
): Promise<string> {
  // Nothing is caught: an export that fails says which image and why, and the caller's transition reports it
  // as the reason the container could not be started — which is what it is.
  for (const image of images ?? []) await workspace.exportImageTar(image);
  return `${workspace.resolveSeedImagesDir()}:${SEED_IMAGES_MOUNT}:ro`;
}

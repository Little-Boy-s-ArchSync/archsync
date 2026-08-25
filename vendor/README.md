# Vendored deterministic runtime

The Examples CI must work without a personal access token to another private repository. It therefore consumes the reviewed Core release candidate recorded in `manifest.json` instead of resolving a private Git dependency during CI.

To update it, check out the intended Core commit, build it, pack it twice into separate empty directories, and require both archives to be byte-identical before replacing the tarball. Record both digests, the source commit, and the candidate status in the manifest; then update the lockfile and package dependency in the same reviewed change. `pnpm verify:vendor` rejects a changed pin, digest, package identity, symbolic-link artifact, or out-of-tree resolution.

The manifest records a provisional integration candidate. It is reproducibility evidence, not a release acceptance or human approval.

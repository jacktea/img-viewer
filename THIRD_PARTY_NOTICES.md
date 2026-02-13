## Third-Party License Notice

This repository includes and distributes WebAssembly codec artifacts built from
third-party libraries. Those components are not covered by the MIT license in
`LICENSE`.

### Bundled codec components

| Component | Version | Used for | Upstream license |
| --- | --- | --- | --- |
| libheif | 1.18.2 | HEIF decode (`packages/core/src/wasm/libheif/*`) | LGPL-3.0-or-later |
| libde265 | 1.0.15 | HEVC decode backend for libheif | LGPL-3.0-or-later |
| LibRaw | 0.21.3 | RAW decode (`packages/core/src/wasm/libraw/*`) | Dual: LGPL-2.1 or CDDL-1.0 |
| libtiff | 4.6.0 | TIFF decode (`packages/core/src/wasm/libtiff/*`) | libtiff license (permissive) |
| zlib | 1.3.1 | Compression dependency for libtiff build | zlib license |

Version sources:
- `wasm/docker/toolchains/versions.env`
- `wasm/docker/scripts/build-libheif.sh`
- `wasm/docker/scripts/build-libraw.sh`
- `wasm/docker/scripts/build-libtiff.sh`

### Included license texts

- `third_party/licenses/libheif-LGPL-3.0-or-later.txt`
- `third_party/licenses/libde265-LGPL-3.0-or-later.txt`
- `third_party/licenses/libraw-LGPL-2.1.txt`
- `third_party/licenses/libraw-CDDL-1.0.txt`
- `third_party/licenses/libtiff-license.txt`
- `third_party/licenses/zlib-license.txt`

### Distribution compliance notes

- Keep this notice file and the above license texts in redistributions.
- Keep original copyright and license notices for bundled codec outputs.
- For LGPL-covered components (libheif/libde265, and LibRaw if you choose the
  LGPL option), provide corresponding source and build instructions for the
  shipped binaries and preserve users' rights granted by LGPL.
- This project already contains build scripts and wrappers under `wasm/docker/`
  to help satisfy source-availability obligations.

If you ship binaries to end users, review your exact distribution model
(including static/dynamic linking behavior and packaging) for LGPL/CDDL
compliance.

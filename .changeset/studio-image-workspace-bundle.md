---
'@loopstack/loopstack-studio': patch
---

Build the Studio image from the workspace bundle.

The image serves a bundle built alongside the rest of the repo, so it ships the code the repo was tested
with and needs no registry access while the image builds. The base image is Node 24.

# spearman-fit-tolnay/spearman.glb: provenance

Review candidate (round r1), not a shipped unit. Licence of the combined asset: CC BY-SA 3.0
(the 0 A.D. rig and clips are share-alike; the model is CC BY 4.0, which permits this).

## Credits

- **Model**: "Hoplite" by tolnaydavid (Sketchfab), CC BY 4.0.
  https://sketchfab.com/3d-models/hoplite-bccbd407bf0e4b0495b352124e222300
  Source: `premium-source/hoplite-tolnay/scene.gltf`, SHA-256
  `9f0fc3c845817895e9cfd04214a72f5c83dc0da2f528e6d17b16e1ad2f8a8056`.
- **Rig and the five clips** (idle, walk, attack, hit, death): 0 A.D. art by Wildfire Games,
  CC BY-SA 3.0; adapted for Legatum. Copied byte for byte from
  `units/spearman-0ad/spearman.glb` (round 6, SHA-256
  `84bf794f543fd4a1af2d1b9c2b48c89a6c52533a00d7803e553b49a22513f92c`).

The exact credit is embedded in `asset.copyright` and `asset.extras.credit`.

## Changes to the model

Removed the sword and the spear straps; the model's own crest (`Helmet_fur`), cape and
armour are kept. Unposed onto the 0 A.D. bind pose and bone lengths; spear seated on the
0 A.D. spear axis and scaled to its length; cape shortened to the 0 A.D. cape hem;
re-skinned with 0 A.D. weights; decimated from about 404k triangles to two LODs (9,591 and
2,895); materials baked to one 1024 WebP set (base colour, normal, ORM); crest, shield rim
and cape trim carry the COLOR_0 team mask with neutral texels.

Rebuild: see `tools/art/anim3d/kit/FIT.md` ("Real models, round r1").

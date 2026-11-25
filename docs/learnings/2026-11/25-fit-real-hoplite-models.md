## 2026-11-25: Fitting the two Sketchfab hoplites onto the 0 A.D. rig (round r1)

- Layered clothing must follow the skin under it: label and unpose the skin only, then give each garment vertex its nearest skin vertex's blend (a garment piece mostly over the torso uses torso skin only). Labelled independently, cuirass corners followed the arms and the skin poked through skirts.
- Bake each layer on its own (skin from skin, clothing from clothing) and bake AO per part: selected-to-active rays from the skin hit the skirt and greaves, and shared AO made camouflage patches on the thighs.
- Repack the source's own UV charts (bounding-box packing) instead of smart projection: smart projection of a decimated sculpt gave thousands of islands; concave packing overlapped islands.
- Blender writes extended WebP (VP8X plus a colour profile); Khronos flags it, so the packer keeps only the bitstream chunk. A glTF import multiplies COLOR_0 into the base colour, so a team-masked GLB imported as a source bakes black unless the texture is relinked.
- `--part` overrides: the last matching rule wins, so a broad `spear=^Spear` beats an earlier `drop=^Spear_straps`; write specific regexes.
- Blocking premium quality: decimating many thin garment shells to 10k triangles shreds them at close range; needs per-garment retopology. Translucent crest-card stacks render as dark spikes when opaque.

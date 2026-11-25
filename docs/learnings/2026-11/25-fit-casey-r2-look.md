## 2026-11-25: Fitted Hoplite Warrior, round r2 (look pass)

- `Image.copy()` in Blender reloads the image's saved file: grades applied to the in-memory pixels after saving the master were silently dropped from the shipped maps. Build shipped images from the pixel array.
- Thin garments kept at source topology no longer shred from decimation; the remaining close-range flaps come from cloth and skin taking separate weights. Clothing now copies the skin's transferred weights.
- Bronze regrade that read right in three.js beside the painting: palette 4a2e12 / a87a36 / f2d48a by source luminance, AO cavities darker, baked pointiness edges brighter, roughness 0.22-0.75. A darker palette (3a2410-dcb874) at roughness about 0.6 read as matte brown.

# Castle asset pipeline

Run from the project root:

```bash
npm run castle:build
```

The Blender script generates and validates:

- `public/castle/exterior/gatehouse.glb`
- `public/castle/zones/gatehouse.glb`
- `public/castle/zones/great-hall.glb`

## Coordinate and naming rules

- One Blender unit equals one meter.
- Assets use the existing castle-zone origin and require no runtime scaling.
- `VIS_*`: rendered architecture.
- `NO_SHADOW_*`: rendered architecture that does not cast shadows.
- `SOCKET_TORCH_*`: runtime torch positions.
- `SOCKET_FOG_GATE`: exterior fog-gate position.
- `COL_*`: optional collision reference meshes.

The game keeps the procedural graybox active until a GLB loads successfully.
Collision remains driven by the existing simplified runtime colliders.

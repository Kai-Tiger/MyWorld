# Castle asset pipeline

Run from the project root:

```bash
npm run castle:build
```

The first run creates an editable source file:

- `assets/blender/castle_master.blend`

After that, edit this Blend file directly. Run the command again to export:

- `public/castle/exterior/gatehouse.glb`
- `public/castle/zones/gatehouse.glb`
- `public/castle/zones/courtyard.glb`
- `public/castle/zones/north-wing.glb`
- `public/castle/zones/south-wing.glb`
- `public/castle/zones/great-hall.glb`
- `public/castle/zones/upper-floor.glb`
- `public/castle/zones/atrium.glb`
- `public/castle/zones/floor-3.glb`
- `public/castle/zones/floor-4.glb`
- `public/castle/zones/roof.glb`
- `public/castle/castle-manifest.json`

## Coordinate and naming rules

- One Blender unit equals one meter.
- Assets use the existing castle-zone origin and require no runtime scaling.
- Each editable area lives in a `ZONE_*` collection.
- `VIS_*`: rendered architecture.
- `NO_SHADOW_*`: rendered architecture that does not cast shadows.
- `SOCKET_TORCH_*`: runtime torch positions.
- `SOCKET_FOG_GATE`: exterior fog-gate position.
- `SOCKET_ENTRY`, `SOCKET_EXIT`: interaction trigger positions.
- `SOCKET_ELEVATOR_PLATFORM`, `SOCKET_ELEVATOR_STOP_*`, `SOCKET_ELEVATOR_LEVER_*`: elevator platform, stops, and lever prompts.
- `SOCKET_ROOF_EXIT`: roof exit interaction prompt.
- `COL_BOX_*`: blocking collision boxes.
- `COL_SURFACE_*`: walkable floor or platform surfaces.
- `COL_RAMP_*`: walkable stair or ramp surfaces.

`COL_*` objects are exported to `castle-manifest.json` and are not included as visible GLB meshes.
The game uses the manifest as the authoritative collision and socket source when it loads successfully.
The procedural graybox and old runtime colliders remain as a fallback if GLB or manifest loading fails.

## Export manual Blender edits

After manually editing and saving `assets/blender/castle_master.blend`, export the saved scene collections directly:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python tools/blender/export_current_castle.py
```

This exports the existing `ZONE_*` collections to `public/castle/**/*.glb` and rebuilds `public/castle/castle-manifest.json` from `COL_*` and `SOCKET_*` objects.

Do not use `npm run castle:build` for this workflow. That command is for procedural rebuilds and may replace hand-edited castle geometry.

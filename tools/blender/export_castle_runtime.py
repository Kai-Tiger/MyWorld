import importlib.util
from pathlib import Path

import mathutils


script_path = Path(__file__).with_name("build_castle.py")
spec = importlib.util.spec_from_file_location("build_castle", script_path)
build_castle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_castle)
build_castle.mathutils = mathutils

build_castle.reset_scene()
build_castle.rebuild_zone_collections()
for zone in build_castle.ZONE_EXPORTS:
    collection = build_castle.bpy.data.collections.get(zone["collection"])
    objects = build_castle.collection_objects(collection)
    build_castle.export_glb(zone["path"], zone["label"], zone["budget"], objects=objects)
build_castle.export_manifest()

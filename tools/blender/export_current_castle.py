import importlib.util
from pathlib import Path


script_path = Path(__file__).with_name("build_castle.py")
spec = importlib.util.spec_from_file_location("build_castle", script_path)
build_castle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_castle)


def main():
    if build_castle.MASTER_BLEND.exists():
        build_castle.bpy.ops.wm.open_mainfile(filepath=str(build_castle.MASTER_BLEND))

    missing = []
    for zone in build_castle.ZONE_EXPORTS:
        collection = build_castle.bpy.data.collections.get(zone["collection"])
        if not collection:
            missing.append(zone["collection"])
            continue

        objects = build_castle.collection_objects(collection)
        build_castle.export_glb(zone["path"], zone["label"], zone["budget"], objects=objects)

    if missing:
        names = ", ".join(missing)
        raise RuntimeError(f"Missing castle zone collection(s): {names}")

    build_castle.export_manifest()


if __name__ == "__main__":
    main()

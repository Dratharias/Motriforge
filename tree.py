import os
import sys
import argparse

# Absolute path to the current script
BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def parse_args():
    parser = argparse.ArgumentParser(description="Explore folder components recursively.")
    parser.add_argument(
        "folder_names",
        nargs="+",
        help="Name(s) of folder(s) to search for (e.g., components hooks services)"
    )
    parser.add_argument(
        "--search-in",
        choices=["frontend", "backend", "both"],
        help="Where to search: 'frontend', 'backend', or 'both'. If omitted, search entire repository."
    )
    return parser.parse_args()


def get_search_roots(search_in):
    possible_dirs = {
        "frontend": os.path.join(BASE_DIR, "frontend"),
        "backend": os.path.join(BASE_DIR, "backend")
    }

    if not search_in:
        # Search entire repo excluding node_modules
        return [BASE_DIR]

    if search_in == "both":
        roots = [path for path in possible_dirs.values() if os.path.isdir(path)]
        if os.path.isdir(BASE_DIR):
            roots.append(BASE_DIR)
    else:
        selected = possible_dirs[search_in]
        roots = [selected] if os.path.isdir(selected) else []

    if not roots:
        print(f"❌ No valid directories found for search: {search_in or 'entire repository'}")
        sys.exit(1)

    return roots


def list_files_recursively(base_path):
    """List all files recursively under a given base path, skipping node_modules."""
    paths = []
    for root, dirs, files in os.walk(base_path):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        for file in files:
            relative = os.path.relpath(os.path.join(root, file), base_path).replace("\\", "/")
            paths.append(relative)
    return sorted(paths)


def print_files_in_folders(folder_names, roots):
    found_folders = set()

    for root_dir in roots:
        for root, dirs, _ in os.walk(root_dir):
            if "node_modules" in dirs:
                dirs.remove("node_modules")

            basename = os.path.basename(root)
            if basename in folder_names:
                if basename not in found_folders:
                    found_folders.add(basename)
                    print(f"\n📁 In {os.path.relpath(root, BASE_DIR).replace('\\', '/')}:")

                files = list_files_recursively(root)
                for filepath in files:
                    print(f"  {filepath}")

    missing = folder_names - found_folders
    if missing:
        print(f"\n❌ No folders found with names: {', '.join(missing)}")


def main():
    args = parse_args()
    folder_names = set(args.folder_names)
    search_roots = get_search_roots(args.search_in)
    print_files_in_folders(folder_names, search_roots)


if __name__ == "__main__":
    main()

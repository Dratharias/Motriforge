import argparse
import os
from pathlib import Path
import re

IGNORED_DIRS = {'node_modules', 'flatten', '.vscode', '.solid', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next', '.nuxt', '.cache', '.idea', '.DS_Store'}
IGNORED_FILES = {'.env', 'package-lock.json', 'flatten.py', 'app.css'}

def is_ignored(path: Path):
    return (
        path.is_dir() and path.name in IGNORED_DIRS
    ) or (
        path.is_file() and path.name in IGNORED_FILES
    )

def unique_filename(dest_dir: Path, filename: str) -> str:
    base, ext = os.path.splitext(filename)
    counter = 1
    new_name = filename
    while (dest_dir / new_name).exists():
        new_name = f"{base}_{counter}{ext}"
        counter += 1
    return new_name

def filter_files(files, in_migrations):
    """Filter files based on migration status and ignored files."""
    filtered = []
    for file in files:
        if in_migrations:
            if re.match(r'^0\d{3}_', file):
                filtered.append(file)
        else:
            if file not in IGNORED_FILES:
                filtered.append(file)
    return filtered

def build_comment_path(full_path: Path, src_dir: Path):
    """Build the comment path for the file header."""
    parts = full_path.parts
    try:
        idx = parts.index('Motriforge')
        return Path(*parts[idx:]).as_posix()
    except ValueError:
        return str(full_path.relative_to(src_dir).as_posix())

def read_file_content(full_path: Path):
    """Read file content, return lines or None on error."""
    try:
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.readlines()
    except Exception as e:
        print(f"Erreur lecture fichier {full_path}: {e}")
        return None

def write_flattened_file(dest_path: Path, comment_path: str, content):
    """Write the flattened file with comment header."""
    try:
        with open(dest_path, 'w', encoding='utf-8') as out:
            out.write(f"// {comment_path}\n")
            out.writelines(content)
    except Exception as e:
        print(f"Erreur écriture fichier {dest_path}: {e}")

def flatten_directory(src_dir: Path, dest_dir: Path):
    if not dest_dir.exists():
        dest_dir.mkdir(parents=True)

    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        root_path = Path(root)
        in_migrations = 'migrations' in root_path.parts

        filtered_files = filter_files(files, in_migrations)
        for file in filtered_files:
            full_path = root_path / file
            comment_path = build_comment_path(full_path, src_dir)
            content = read_file_content(full_path)
            if content is None:
                continue
            unique_name = unique_filename(dest_dir, file)
            dest_path = dest_dir / unique_name
            write_flattened_file(dest_path, comment_path, content)


def main():
    parser = argparse.ArgumentParser(description="Flatten directory and add relative path comment.")
    parser.add_argument('--dir', required=True, help="Source directory (ex: Motriforge)")
    args = parser.parse_args()

    src_dir = Path(args.dir).resolve()
    dest_dir = Path('./flatten').resolve()

    flatten_directory(src_dir, dest_dir)

if __name__ == "__main__":
    main()

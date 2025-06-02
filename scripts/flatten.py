import os
import shutil
import glob
import re
import argparse

# Constants
BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'flatten'))
TYPES_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'src', 'types'))
SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend'))
DOCS_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'docs'))
INPUT_FILE = os.path.join(BASE_DIR, 'to-flatten.txt')

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def remove_comments(content: str) -> str:
    """Remove all single-line (//...) and multi-line docblock (/** ... */) comments."""
    content = re.sub(r'/\*\*[\s\S]*?\*/', '', content)
    lines = content.splitlines()
    cleaned_lines = []
    for line in lines:
        quote_open = False
        new_line = ''
        i = 0
        while i < len(line):
            if line[i] in ('"', "'"):
                if not quote_open:
                    quote_open = line[i]
                elif quote_open == line[i]:
                    quote_open = False
                new_line += line[i]
                i += 1
            elif not quote_open and line[i:i+2] == '//':
                break
            else:
                new_line += line[i]
                i += 1
        if new_line.strip():
            cleaned_lines.append(new_line.rstrip())
    return '\n'.join(cleaned_lines)

def get_relative_path_comment(full_path: str, base: str) -> str:
    try:
        rel_path = os.path.relpath(full_path, base).replace(os.sep, '/')
        return f"// {rel_path}\n\n"
    except Exception:
        return "// <unknown path>\n\n"

def copy_and_clean_file(src_path: str, dest_path: str, comment_base: str):
    try:
        with open(src_path, 'r', encoding='utf-8') as f:
            content = f.read()
        cleaned_content = remove_comments(content)
        relative_comment = get_relative_path_comment(src_path, comment_base)
        with open(dest_path, 'w', encoding='utf-8') as f:
            f.write(relative_comment + cleaned_content)
        print(f"✅ Copied and cleaned {os.path.basename(src_path)}")
    except Exception as e:
        print(f"❌ Failed to process {src_path}: {e}")

def flatten_from_file():
    if not os.path.exists(INPUT_FILE):
        return
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
    for line in lines:
        if os.path.isabs(line):
            full_path = line
        else:
            full_path = os.path.abspath(os.path.join(SRC_DIR, line))
        if not os.path.isfile(full_path):
            print(f"❌ File does not exist: {full_path}")
            continue
        file_name = os.path.basename(full_path)
        destination_path = os.path.join(OUTPUT_DIR, file_name)
        if os.path.exists(destination_path):
            print(f"⚠ Skipping {file_name}: already exists in flatten/")
            continue
        copy_and_clean_file(full_path, destination_path, SRC_DIR)

def flatten_types():
    ts_files = glob.glob(os.path.join(TYPES_DIR, '**', '*.ts'), recursive=True)
    for ts_path in ts_files:
        file_name = os.path.basename(ts_path)
        destination_path = os.path.join(OUTPUT_DIR, file_name)
        if os.path.exists(destination_path):
            print(f"⚠ Skipping {file_name}: already exists in flatten/")
            continue
        copy_and_clean_file(ts_path, destination_path, SRC_DIR)

def flatten_all_src():
    ts_files = glob.glob(os.path.join(SRC_DIR, '**', '*.ts'), recursive=True)
    for ts_path in ts_files:
        file_name = os.path.basename(ts_path)
        destination_path = os.path.join(OUTPUT_DIR, file_name)
        if os.path.exists(destination_path):
            print(f"⚠ Skipping {file_name}: already exists in flatten/")
            continue
        copy_and_clean_file(ts_path, destination_path, SRC_DIR)

def flatten_test_files():
    test_files = glob.glob(os.path.join(SRC_DIR, '**', '*.test.ts'), recursive=True)
    for ts_path in test_files:
        file_name = os.path.basename(ts_path)
        destination_path = os.path.join(OUTPUT_DIR, file_name)
        if os.path.exists(destination_path):
            print(f"⚠ Skipping {file_name}: already exists in flatten/")
            continue
        copy_and_clean_file(ts_path, destination_path, SRC_DIR)

def flatten_by_dir_name(target_dir_name: str):
    matched_dirs = []
    for root, dirs, _ in os.walk(SRC_DIR):
        for d in dirs:
            if d == target_dir_name:
                matched_dirs.append(os.path.join(root, d))

    if not matched_dirs:
        print(f"❌ No directory named '{target_dir_name}' found in {SRC_DIR}")
        return

    for dir_path in matched_dirs:
        ts_files = glob.glob(os.path.join(dir_path, '**', '*.ts'), recursive=True)
        for ts_path in ts_files:
            file_name = os.path.basename(ts_path)
            destination_path = os.path.join(OUTPUT_DIR, file_name)
            if os.path.exists(destination_path):
                print(f"⚠ Skipping {file_name}: already exists in flatten/")
                continue
            copy_and_clean_file(ts_path, destination_path, SRC_DIR)

def flatten_docs():
    doc_files = glob.glob(os.path.join(DOCS_DIR, '**', '*.md'), recursive=True)
    if not doc_files:
        print(f"❌ No .ts files found in {DOCS_DIR}")
        return
    for doc_path in doc_files:
        file_name = os.path.basename(doc_path)
        destination_path = os.path.join(OUTPUT_DIR, file_name)
        if os.path.exists(destination_path):
            print(f"⚠ Skipping {file_name}: already exists in flatten/")
            continue
        copy_and_clean_file(doc_path, destination_path, DOCS_DIR)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Flatten files from backend/src or docs.")
    parser.add_argument('--flatten-all', action='store_true', help="Flatten everything from backend/src/**/*.ts")
    parser.add_argument('--types', action='store_true', help="Only flatten types from backend/src/types/**/*.ts")
    parser.add_argument('--test', action='store_true', help="Only flatten test files backend/src/**/*.test.ts")
    parser.add_argument('--dir', type=str, help="Name of the directory to recursively flatten from")
    parser.add_argument('--docs', action='store_true', help="Flatten all .ts files from root-level docs/")
    args = parser.parse_args()

    if args.flatten_all:
        flatten_all_src()
    elif args.types:
        flatten_types()
    elif args.test:
        flatten_test_files()
    elif args.dir:
        flatten_by_dir_name(args.dir)
    elif args.docs:
        flatten_docs()
    else:
        flatten_from_file()

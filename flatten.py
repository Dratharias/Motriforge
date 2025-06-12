import argparse
import os

def extract_top_comment_and_content(lines):
    top_comment = ""
    if lines and lines[0].startswith("// "):
        if lines[0].strip().startswith("// folder/"):
            top_comment = lines[0]
            content = lines[1:]
        else:
            content = lines
    else:
        content = lines
    return top_comment, content

def extract_top_comment_and_flatten(src_dir, dest_dir):
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)

    for root, _, files in os.walk(src_dir):
        for f in files:
            src_path = os.path.join(root, f)
            with open(src_path, 'r', encoding='utf-8', errors='ignore') as file:
                lines = file.readlines()

            top_comment, content = extract_top_comment_and_content(lines)

            dest_path = os.path.join(dest_dir, f)
            with open(dest_path, 'w', encoding='utf-8') as out_file:
                if top_comment:
                    out_file.write(top_comment)
                out_file.writelines(content)

def main():
    parser = argparse.ArgumentParser(description="Flatten directory files and extract top comment.")
    parser.add_argument('--dir', required=True, help="Source directory to flatten")
    args = parser.parse_args()

    extract_top_comment_and_flatten(args.dir, './flatten')

if __name__ == "__main__":
    main()

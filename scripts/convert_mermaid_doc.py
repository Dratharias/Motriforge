import os

def wrap_and_rename_mermaid_files(doc_dir='../doc'):
    if not os.path.isdir(doc_dir):
        print(f"Directory '{doc_dir}' does not exist.")
        return

    for root, _, files in os.walk(doc_dir):
        for file in files:
            if file.endswith('.mermaid'):
                original_path = os.path.join(root, file)
                new_filename = os.path.splitext(file)[0] + '.md'
                new_path = os.path.join(root, new_filename)

                with open(original_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                # Check if already wrapped
                if lines and lines[0].strip() == '```mermaid':
                    print(f"Already wrapped: {original_path}, renaming only.")
                    with open(new_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)
                else:
                    wrapped_lines = ['```mermaid\n'] + lines + ['```\n']
                    with open(new_path, 'w', encoding='utf-8') as f:
                        f.writelines(wrapped_lines)
                    print(f"Wrapped and renamed: {original_path} -> {new_path}")

                os.remove(original_path)

if __name__ == "__main__":
    wrap_and_rename_mermaid_files()

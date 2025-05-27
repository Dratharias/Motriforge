import re
import argparse
from pathlib import Path

def extract_segments(generated_file: Path):
    """
    Parses a generated file and extracts code segments keyed by destination path.
    Lines with a comment containing a relative filepath start a new segment.
    Supports comments // or # before the path.
    Interprets paths starting with '@/...' as 'src/...'
    """
    path_pattern = re.compile(r'^[ \t]*(?://|#)\s*(?P<path>@?[\w\-./]+\.[\w]+)')
    segments = []  # List of (relative_path, code_lines)
    current_path = None
    current_lines = []
    lines = generated_file.read_text(encoding='utf-8').splitlines(keepends=True)
    i = 0
    while i < len(lines):
        line = lines[i]
        m = path_pattern.match(line)
        if m:
            # Normalize path
            raw_path = m.group('path')
            normalized_path = raw_path.replace('@/','src/') if raw_path.startswith('@/') else raw_path

            # Save previous segment
            if current_path and current_lines:
                segments.append((current_path, ''.join(current_lines)))

            # Start new segment
            current_path = normalized_path
            current_lines = []

            # Skip the current annotation line
            i += 1

            # Also skip the next line if it's blank (just newline or whitespace)
            if i < len(lines) and lines[i].strip() == '':
                i += 1
            continue

        if current_path:
            current_lines.append(line)
        i += 1

    # Save last segment
    if current_path and current_lines:
        segments.append((current_path, ''.join(current_lines)))
    return segments



def process_all(generated_root: Path, backend_root: Path):
    """
    Processes all files in generated_root, extracts segments, and writes them into backend_root.
    """
    for gen_file in generated_root.rglob('*'):
        if not gen_file.is_file():
            continue
        print(f"Processing {gen_file}")
        try:
            segments = extract_segments(gen_file)
            for rel_path, code in segments:
                dest_path = backend_root / rel_path
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                with dest_path.open('w', encoding='utf-8') as f:
                    f.write(code)
                print(f"  Wrote {dest_path}")
        except Exception as e:
            print(f"Failed to process {gen_file}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description='Process generated code files and distribute segments into backend folder'
    )
    parser.add_argument(
        '--generated', '-g',
        type=Path,
        default=Path(__file__).parent.parent / 'generated',
        help='Path to the generated files root'
    )
    parser.add_argument(
        '--backend', '-b',
        type=Path,
        default=Path(__file__).parent.parent / 'backend',
        help='Path to the backend root directory'
    )
    args = parser.parse_args()

    generated_root = args.generated.resolve()
    backend_root = args.backend.resolve()

    if not generated_root.exists():
        print(f"Generated folder not found: {generated_root}")
        return

    process_all(generated_root, backend_root)

if __name__ == '__main__':
    main()

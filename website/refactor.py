import os
import re

directories = ['components', 'app']
file_pattern = re.compile(r'\.tsx$')

replacements = {
    r'bg-\[#0B0B0F\]': 'bg-ob-bg',
    r'bg-\[#080A0F\]': 'bg-ob-bg',
    r'bg-\[#111217\]': 'bg-ob-surface',
    r'bg-\[#0E1118\]': 'bg-ob-surface',
    r'bg-\[#181A20\]': 'bg-ob-elevated',
    r'bg-\[#06080C\]': 'bg-ob-code',
    r'border-\[#262A33\]': 'border-ob-border',
    r'border-\[#222838\]': 'border-ob-border',
    r'border-\[#1F2636\]': 'border-ob-border',
    r'border-\[#1E2433\]': 'border-ob-border',
    r'text-\[#FFFFFF\]': 'text-ob-primary',
    r'\btext-white\b': 'text-ob-primary',
    r'text-\[#B8BDC7\]': 'text-ob-secondary',
    r'text-\[#7A808A\]': 'text-ob-muted',
    r'\btext-slate-200\b': 'text-ob-primary'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    for d in directories:
        for root, _, files in os.walk(d):
            for file in files:
                if file_pattern.search(file):
                    process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()

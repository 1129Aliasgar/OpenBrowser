import os
import re

directories = ['components', 'app']
file_pattern = re.compile(r'\.tsx$')

# Exclude list to protect special components
exclude_files = [
    'interactive-terminal.tsx',
    'product-feature-showcase.tsx',
    'bridge-architecture.tsx'
]

replacements = {
    r'bg-ob-bg': 'bg-background',
    r'bg-ob-surface': 'bg-card',
    r'bg-ob-elevated': 'bg-popover',
    r'bg-ob-code': 'bg-code',
    r'border-ob-border': 'border-border',
    r'text-ob-primary': 'text-foreground',
    r'text-ob-secondary': 'text-muted-foreground',
    r'text-ob-muted': 'text-muted-foreground',
    
    # Generic Tailwind dark colors that were missed
    r'text-slate-200': 'text-foreground',
    r'text-slate-300': 'text-muted-foreground',
    r'text-slate-400': 'text-muted-foreground',
    r'text-slate-500': 'text-muted-foreground',
    r'bg-slate-800': 'bg-secondary',
    r'bg-slate-900': 'bg-card',
    r'border-slate-700': 'border-input',
    r'border-slate-800': 'border-border',
    
    # Provider Grid gradients
    r'from-blue-500/20 to-blue-950/40': 'bg-card',
    r'border-blue-500/30': 'border-border',
    r'text-blue-400': 'text-primary',
    r'bg-blue-500/10': 'bg-primary/10',
    r'border-blue-500/20': 'border-primary/20',
    
    r'bg-\[#080E18\]': 'bg-card',
    r'bg-[#0B0B0F]': 'bg-background',
    r'bg-[#111217]': 'bg-card',
    r'bg-[#181A20]': 'bg-popover',
    r'text-[#FFFFFF]': 'text-foreground',
    r'text-[#B8BDC7]': 'text-muted-foreground',
    r'border-[#262A33]': 'border-border',
}

def process_file(filepath):
    # Don't touch button.tsx and card.tsx as they are already refactored manually
    if filepath.endswith('button.tsx') or filepath.endswith('card.tsx'):
        return

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
                if file_pattern.search(file) and file not in exclude_files:
                    process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Fix responsive tables and toolbars in all page.tsx files.
1. Wrap <table className="table..." with <div className="overflow-x-auto">...</div>
2. Fix toolbar flex rows: "flex flex-row" containing Show entries + search input
"""
import re
import os
import glob

APP = "/home/muhammad/lss-erp/app"
files = glob.glob(f"{APP}/**/page.tsx", recursive=True)
files = [f for f in files if not any(x in f for x in ['/login/', '/reset/', '/select-location/', '/api/', 'node_modules'])]

def wrap_tables(content):
    """Wrap <table with overflow-x-auto div if not already wrapped."""
    # Pattern: table tag possibly on same or next lines
    pattern = r'(<div[^>]*overflow-x-auto[^>]*>[\s\S]*?<table|<table\b[^>]*className="table[^"]*")'
    
    # Simple approach: find standalone <table ... className="table and wrap
    # Check if already wrapped
    result = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Check if this line starts a table and is not already inside overflow-x-auto
        if re.search(r'<table\b', stripped) and 'className="table' in stripped:
            # Look backwards to see if there's overflow-x-auto nearby (last 3 lines)
            prev_context = '\n'.join(lines[max(0, i-3):i])
            if 'overflow-x-auto' not in prev_context:
                indent = len(line) - len(line.lstrip())
                spaces = ' ' * indent
                result.append(f'{spaces}<div className="overflow-x-auto w-full">')
                result.append(line)
                i += 1
                # Find closing </table> 
                depth = 0
                close_found = False
                j = i
                while j < len(lines):
                    if '<table' in lines[j]:
                        depth += 1
                    if '</table>' in lines[j]:
                        if depth == 0:
                            result.append(lines[j])
                            result.append(f'{spaces}</div>')
                            i = j + 1
                            close_found = True
                            break
                        depth -= 1
                    else:
                        result.append(lines[j])
                    j += 1
                if not close_found:
                    i = j
                continue
        result.append(line)
        i += 1
    return '\n'.join(result)


def fix_toolbar(content):
    """
    Find patterns like:
      <div className="flex flex-row">
        <div className="flex flex-row gap-2 items-center">Show <select>...</select>Entries</div>
        <input ... className="toolbar-search" />  (already replaced by sed)
      </div>
    And change outer div to flex flex-col sm:flex-row gap-2 items-start sm:items-center
    """
    # Replace toolbar wrapper: a flex-row div that contains "Show" and a search input
    content = re.sub(
        r'className="flex flex-row"(\s*>\s*\n\s*<div[^>]*flex[^>]*>\s*\n\s*Show)',
        r'className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"\1',
        content
    )
    return content

changed = 0
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    content = original
    content = wrap_tables(content)
    content = fix_toolbar(content)
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        changed += 1
        print(f"  Changed: {fpath.replace(APP+'/', '')}")

print(f"\nTotal files changed: {changed} / {len(files)}")

#!/usr/bin/env python3
from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
errors=[]
files=list(root.rglob('*.md'))+list(root.rglob('*.mmd'))+list(root.rglob('*.sql'))
for p in files:
    text=p.read_text(encoding='utf-8')
    if len(text.strip()) < 30: errors.append(f'Too little content: {p.relative_to(root)}')
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if target.startswith(('http://','https://','mailto:','#')): continue
        rel=target.split('#',1)[0]
        if rel and not (p.parent/rel).resolve().exists(): errors.append(f'Broken link: {p.relative_to(root)} -> {target}')
required=['README.md','docs/04-product-requirements.md','docs/database/schema.sql','docs/database/data-dictionary.md','prompts/00-master-instructions.md','prompts/01-repository-and-environment-audit.md','prompts/23-production-readiness.md']
for r in required:
    if not (root/r).exists(): errors.append('Missing '+r)
if errors:
    print('FAILED'); print('\n'.join(errors)); sys.exit(1)
print(f'Passed: inspected {len(files)} Markdown/Mermaid/SQL files')

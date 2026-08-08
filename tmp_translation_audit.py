import re
import json
from pathlib import Path
files = [Path('src/pages/CourseDetailsDB.jsx'), Path('src/components/course/LessonCard.jsx')]
keys = set()
for f in files:
    text = f.read_text(encoding='utf-8')
    for m in re.finditer(r"t\(\s*['\"]([^'\"]+)['\"]", text):
        keys.add(m.group(1))
en = json.loads(Path('src/i18n/locales/en.json').read_text(encoding='utf-8'))
ar = json.loads(Path('src/i18n/locales/ar.json').read_text(encoding='utf-8'))

def flatten(d, prefix=''):
    items = {}
    if isinstance(d, dict):
        for kk,v in d.items():
            name = f'{prefix}.{kk}' if prefix else kk
            items.update(flatten(v, name))
    else:
        items[prefix] = d
    return items

enf = flatten(en)
arf = flatten(ar)
print('---keys---')
print('\n'.join(sorted(keys)))
print('---missing-en---')
for k in sorted(keys):
    if k not in enf:
        print(k)
print('---missing-ar---')
for k in sorted(keys):
    if k not in arf:
        print(k)

from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path('/tmp')
FILES = {
    'home': ROOT / 'kara-home-after.xml',
    'checking': ROOT / 'kara-checking-after.xml',
    'assignments': ROOT / 'kara-assignments-after.xml',
    'more': ROOT / 'kara-more-after.xml',
    'classes': ROOT / 'kara-classes-after.xml',
    'scan': ROOT / 'kara-scan-after.xml',
    'processing': ROOT / 'kara-processing-after.xml',
    'student': ROOT / 'kara-student-after.xml',
    'result': ROOT / 'kara-result-after.xml',
    'review': ROOT / 'kara-review-after.xml',
    'analytics': ROOT / 'kara-analytics-after.xml',
    'export': ROOT / 'kara-export-after.xml',
}
SCREEN_RIGHT = 1080
CONTENT_RIGHT = 1024
NAV_TOP = 2205
MIN_TOUCH_PX = 135
BOUNDS = re.compile(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]')


def parse_bounds(value):
    match = BOUNDS.fullmatch(value)
    if not match:
        raise AssertionError(f'Invalid bounds: {value}')
    return tuple(map(int, match.groups()))


def nodes(name):
    path = FILES[name]
    if not path.exists():
        raise AssertionError(f'Missing evidence: {path}')
    return list(ET.parse(path).getroot().iter('node'))


def find_desc(name, value):
    matches = [node for node in nodes(name) if node.attrib.get('content-desc') == value]
    if not matches:
        raise AssertionError(f'{name}: missing content-desc {value!r}')
    return matches[0]


results = []

scan_cta = parse_bounds(find_desc('scan', 'Продолжить с этим листом').attrib['bounds'])
x1, y1, x2, y2 = scan_cta
assert 0 <= x1 < x2 <= SCREEN_RIGHT, scan_cta
assert 97 <= y1 < y2 <= NAV_TOP, scan_cta
assert y2 - y1 >= MIN_TOUCH_PX, scan_cta
results.append(f'scan CTA visible: {scan_cta}, height={y2-y1}px')

review_nodes = nodes('review')
review_glyphs = []
for node in review_nodes:
    text = node.attrib.get('text', '')
    if len(text) == 1 and text in set('ӨСТӘЛДӘНТ'):
        bounds = parse_bounds(node.attrib['bounds'])
        if 450 <= bounds[1] <= 1300:
            review_glyphs.append((text, bounds))
assert len(review_glyphs) >= 16, len(review_glyphs)
assert max(bounds[2] for _, bounds in review_glyphs) <= CONTENT_RIGHT, review_glyphs
assert all(bounds[0] < bounds[2] for _, bounds in review_glyphs), review_glyphs
results.append(f'review glyphs inside card: {len(review_glyphs)} glyphs, maxX={max(b[2] for _, b in review_glyphs)}')

result_nodes = nodes('result')
metric_labels = {}
for label in ('Верно', 'На проверку', 'Вариант'):
    candidates = [n for n in result_nodes if n.attrib.get('text') == label]
    assert candidates, f'result missing {label}'
    metric_labels[label] = parse_bounds(candidates[0].attrib['bounds'])
tops = [bounds[1] for bounds in metric_labels.values()]
assert max(tops) - min(tops) <= 10, metric_labels
results.append(f'result metrics one row: {metric_labels}')

home_nodes = nodes('home')
for label in ('Главная', 'Проверка', 'Задания', 'Ещё'):
    candidates = [n for n in home_nodes if n.attrib.get('text') == label]
    assert candidates, f'home missing tab {label}'
    bounds = parse_bounds(candidates[-1].attrib['bounds'])
    assert bounds[3] <= NAV_TOP, (label, bounds)
results.append('tab labels remain above system navigation')

clickable_failures = []
for name in FILES:
    for node in nodes(name):
        if node.attrib.get('clickable') != 'true':
            continue
        desc = node.attrib.get('content-desc') or node.attrib.get('text') or node.attrib.get('class')
        bounds = parse_bounds(node.attrib['bounds'])
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        if width < MIN_TOUCH_PX or height < MIN_TOUCH_PX:
            clickable_failures.append((name, desc, bounds, width, height))
assert not clickable_failures, clickable_failures
results.append('all exposed clickable nodes are at least 48dp (135px)')

print('\n'.join(f'PASS: {line}' for line in results))

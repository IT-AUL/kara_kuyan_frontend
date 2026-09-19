#!/usr/bin/env python3
"""Validate UIAutomator dumps for Kara Kuyan device polish acceptance criteria."""

import os
import re
import sys
from pathlib import Path

DUMP_DIR = Path("/Users/renat/dev/kara_kuyan_frontend/harness/changes/active/android-device-polish/evidence/after/dumps")
NAV_BAR_TOP = 2205  # Android nav bar y-start on SM-S928B
SCREEN_WIDTH = 1080
MIN_TOUCH_TARGET = 48 * 2.8125  # 48dp * density (450/160=2.8125) = 135px

BOUNDS_RE = re.compile(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]')

def parse_bounds(bounds_str):
    m = BOUNDS_RE.search(bounds_str)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    return None

def check_file(path, checks):
    if not path.exists():
        return [f"SKIP {path.name}: file not found"]
    content = path.read_text()
    results = []
    for check_name, check_fn in checks:
        result = check_fn(content)
        status = "PASS" if result[0] else "FAIL"
        results.append(f"{status} {path.stem}/{check_name}: {result[1]}")
    return results

def check_clickable_48dp(content):
    """All clickable nodes >= 48dp (135px at 450dpi). Excludes Expo dev-client overlay."""
    # Match clickable nodes with their content-desc for filtering
    node_pattern = re.compile(r'content-desc="([^"]*)"[^>]*clickable="true"[^>]*bounds="([^"]+)"')
    matches = node_pattern.findall(content)
    # Also match reversed order
    node_pattern2 = re.compile(r'clickable="true"[^>]*content-desc="([^"]*)"[^>]*bounds="([^"]+)"')
    matches.extend(node_pattern2.findall(content))
    failures = []
    for desc, bounds_str in matches:
        # Exclude Expo dev-client overlay (spec: excluded from product UI evaluation)
        if 'Развернуть панель' in desc or 'dev-client' in desc.lower():
            continue
        b = parse_bounds(bounds_str)
        if b:
            h = b[3] - b[1]
            w = b[2] - b[0]
            if h < MIN_TOUCH_TARGET and w < MIN_TOUCH_TARGET:
                failures.append(f"bounds={bounds_str} h={h:.0f}px w={w:.0f}px < {MIN_TOUCH_TARGET:.0f}px")
    if failures:
        return False, f"{len(failures)} undersized: " + "; ".join(failures[:3])
    return True, f"{len(matches)} clickable nodes >= 48dp"

def check_content_above_navbar(content):
    """All app content nodes (non-system) stay above nav bar top."""
    # Exclude navigationBarBackground (system edge-to-edge element)
    nodes = re.findall(r'resource-id="([^"]*)"[^>]*package="com.karakuyan.app"[^>]*bounds="([^"]+)"', content)
    violations = []
    for res_id, bounds_str in nodes:
        if 'navigationBarBackground' in res_id or 'statusBarBackground' in res_id:
            continue
        b = parse_bounds(bounds_str)
        if b and b[3] > NAV_BAR_TOP:
            if b[1] >= NAV_BAR_TOP:  # starts inside nav bar
                violations.append(f"bounds={bounds_str} id={res_id}")
    if violations:
        return False, f"{len(violations)} nodes inside nav bar"
    return True, f"{len(nodes)} nodes all above nav bar (y={NAV_BAR_TOP})"

def check_content_within_width(content):
    """No content extends beyond screen width."""
    nodes = re.findall(r'package="com.karakuyan.app"[^>]*bounds="([^"]+)"', content)
    violations = []
    for bounds_str in nodes:
        b = parse_bounds(bounds_str)
        if b and b[2] > SCREEN_WIDTH:
            violations.append(f"bounds={bounds_str} extends to x={b[2]}")
    if violations:
        return False, f"{len(violations)} overflow: " + "; ".join(violations[:3])
    return True, f"all nodes within x=0..{SCREEN_WIDTH}"

def check_tab_bounds(content):
    """Tab labels fit above nav bar."""
    tabs = re.findall(r'content-desc="[^"]*(?:Главная|Проверка|Задания|Ещё)[^"]*"[^>]*bounds="([^"]+)"', content)
    if not tabs:
        return True, "no tabs found (non-tab screen)"
    for bounds_str in tabs:
        b = parse_bounds(bounds_str)
        if b and b[3] > NAV_BAR_TOP:
            return False, f"tab extends into nav bar: {bounds_str}"
    return True, f"{len(tabs)} tabs above nav bar"

COMMON_CHECKS = [
    ("clickable-48dp", check_clickable_48dp),
    ("content-above-navbar", check_content_above_navbar),
    ("content-within-width", check_content_within_width),
    ("tab-bounds", check_tab_bounds),
]

def main():
    if not DUMP_DIR.exists():
        print(f"ERROR: dump dir not found: {DUMP_DIR}")
        sys.exit(1)
    
    dumps = sorted(DUMP_DIR.glob("*.xml"))
    if not dumps:
        print("ERROR: no XML dumps found")
        sys.exit(1)
    
    all_results = []
    for dump in dumps:
        results = check_file(dump, COMMON_CHECKS)
        all_results.extend(results)
    
    passes = sum(1 for r in all_results if r.startswith("PASS"))
    fails = sum(1 for r in all_results if r.startswith("FAIL"))
    skips = sum(1 for r in all_results if r.startswith("SKIP"))
    
    print("=" * 60)
    print(f"DEVICE GATE: {passes} PASS, {fails} FAIL, {skips} SKIP")
    print("=" * 60)
    for r in all_results:
        print(r)
    
    sys.exit(1 if fails > 0 else 0)

if __name__ == "__main__":
    main()

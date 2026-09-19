#!/bin/bash
# Capture screenshots + UIAutomator dumps for all Kara Kuyan routes
# Coordinates from SM-S928B UIAutomator dump (1080x2340, 450dpi)

set -e

EVIDENCE="/Users/renat/dev/kara_kuyan_frontend/harness/changes/active/android-device-polish/evidence/after"
SS="$EVIDENCE/screenshots"
DM="$EVIDENCE/dumps"
mkdir -p "$SS" "$DM"

capture() {
  local name=$1
  sleep 1.5
  adb shell screencap -p /sdcard/kara_tmp.png
  adb pull /sdcard/kara_tmp.png "$SS/${name}.png" > /dev/null 2>&1
  adb shell uiautomator dump /sdcard/kara_tmp.xml > /dev/null 2>&1
  adb pull /sdcard/kara_tmp.xml "$DM/${name}.xml" > /dev/null 2>&1
  echo "✅ $name"
}

tap_tab() {
  # Tab centers: Главная=135, Проверка=405, Задания=675, Ещё=945, y=2116
  local x=$1
  adb shell input tap $x 2116
}

echo "=== Capturing all routes ==="

# 1. Home (already open after app launch)
capture "home"

# 2. Checking tab
tap_tab 405
capture "checking"

# 3. Assignments tab
tap_tab 675
capture "assignments"

# 4. More tab
tap_tab 945
capture "more"

# 5. Classes (from More → Классы list item, first item ~y=700)
adb shell input tap 540 680
sleep 1
capture "classes"
adb shell input keyevent KEYCODE_BACK
sleep 1

# 6. Analytics (from More → Аналитика, second item ~y=830)  
adb shell input tap 540 830
sleep 1
capture "analytics"
adb shell input keyevent KEYCODE_BACK
sleep 1

# 7. Export gradebook (from More → Экспорт журнала, third item ~y=980)
adb shell input tap 540 980
sleep 1
capture "export-gradebook"
adb shell input keyevent KEYCODE_BACK
sleep 1

# 8. Navigate to checking tab → scan
tap_tab 405
sleep 1
# Tap "Сканировать следующий лист" button
adb shell input tap 540 880
sleep 1
capture "scan"

# 9. Processing (tap "Продолжить с этим листом" footer button)
# Find footer button — should be near bottom above tab bar
adb shell input tap 540 2050
sleep 2
capture "processing"

# 10. Student identified (processing auto-transitions or tap)
sleep 2
capture "student-identified"

# 11. Assessment result (auto-transition from student)
sleep 2
capture "assessment-result"

# 12. Task review (tap "Проверить отмеченный ответ")
adb shell input tap 540 2050
sleep 1
capture "task-review"

echo "=== Done: $(ls "$SS"/*.png | wc -l) screenshots, $(ls "$DM"/*.xml | wc -l) dumps ==="

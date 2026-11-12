cmake_minimum_required(VERSION 3.22.1)
project(tatar_ocr_android_jni LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 1. OpenCV >= 4.7 (with objdetect + ArUco) via Gradle Prefab from org.opencv:opencv:5.0.0.
#    Prefab exposes package `OpenCV` (target `OpenCV::opencv_java5`), whereas upstream
#    `third_party/tatar_ocr/native/CMakeLists.txt` calls `find_package(OpenCV REQUIRED)` and
#    reads `OpenCV_INCLUDE_DIRS` + `OpenCV_LIBS`. Unset any cached shim first so Prefab's
#    `OpenCVConfig.cmake` always loads on both Linux (case-sensitive) and macOS, then point
#    `OpenCV_DIR` at a minimal shim exposing `OpenCV_LIBS` and `OpenCV_INCLUDE_DIRS`.
unset(OpenCV_DIR CACHE)
find_package(OpenCV REQUIRED CONFIG)
get_target_property(_ocv_inc OpenCV::opencv_java5 INTERFACE_INCLUDE_DIRECTORIES)
set(_ocv_shim_dir "${CMAKE_CURRENT_BINARY_DIR}/opencv_shim")
file(MAKE_DIRECTORY "${_ocv_shim_dir}")
file(WRITE "${_ocv_shim_dir}/OpenCVConfig.cmake"
  "set(OpenCV_FOUND TRUE)\n"
  "set(OpenCV_LIBS OpenCV::opencv_java5)\n"
  "set(OpenCV_INCLUDE_DIRS \"${_ocv_inc}\")\n"
)
set(OpenCV_DIR "${_ocv_shim_dir}" CACHE PATH "" FORCE)

# 2. ONNX Runtime Android C++ headers + per-ABI shared library extracted from onnxruntime-android AAR.
if(NOT DEFINED ONNXRUNTIME_EXTRACTED_DIR)
  message(FATAL_ERROR "ONNXRUNTIME_EXTRACTED_DIR must be passed from build.gradle")
endif()
set(ONNXRUNTIME_INCLUDE_DIR "${ONNXRUNTIME_EXTRACTED_DIR}/headers" CACHE PATH "" FORCE)
set(ONNXRUNTIME_LIB "${ONNXRUNTIME_EXTRACTED_DIR}/jni/${ANDROID_ABI}/libonnxruntime.so" CACHE FILEPATH "" FORCE)

# 3. nlohmann/json single-header C++ library.
set(NLOHMANN_JSON_INCLUDE_DIR "${CMAKE_CURRENT_LIST_DIR}/third_party" CACHE PATH "" FORCE)

# 4. Upstream C++20 OCR core without Python bindings.
set(TATAR_OCR_BUILD_PYTHON OFF CACHE BOOL "" FORCE)
if(NOT DEFINED TATAR_OCR_SUBMODULE_DIR)
  set(TATAR_OCR_SUBMODULE_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../../../../third_party/tatar_ocr")
endif()
add_subdirectory("${TATAR_OCR_SUBMODULE_DIR}/native" tatar_ocr_build)
target_compile_options(tatar_ocr_core PRIVATE -O3)

# 5. JNI shared library bridging NativeBlankScanner to Kotlin/Expo.
add_library(tatar_ocr_jni SHARED jni_bridge.cpp)
target_compile_options(tatar_ocr_jni PRIVATE -O3)
target_link_libraries(tatar_ocr_jni PRIVATE tatar_ocr_core log)
target_link_options(tatar_ocr_jni PRIVATE "-Wl,-z,max-page-size=16384")

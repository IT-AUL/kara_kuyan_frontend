#include <jni.h>
#include <android/log.h>

#include <chrono>
#include <exception>
#include <memory>
#include <mutex>
#include <string>

#include <nlohmann/json.hpp>
#include "tatar_ocr.hpp"

namespace {

constexpr const char* kLogTag = "TatarOcrJni";

struct ScannerHandle {
    std::mutex mtx;
    tatar_ocr::NativeBlankScanner scanner;

    ScannerHandle(const std::string& model_path, const std::string& spec_path)
        : scanner(model_path, spec_path) {}
};

std::string jstring_to_utf8(JNIEnv* env, jstring jstr) {
    if (!jstr) return "";
    const char* chars = env->GetStringUTFChars(jstr, nullptr);
    if (!chars) return "";
    std::string out(chars);
    env->ReleaseStringUTFChars(jstr, chars);
    return out;
}

void throw_java_runtime(JNIEnv* env, const char* msg) {
    jclass cls = env->FindClass("java/lang/IllegalStateException");
    if (cls) {
        env->ThrowNew(cls, msg ? msg : "Native OCR error");
    }
}

nlohmann::json serialize_cell(const tatar_ocr::ScannedCell& c) {
    nlohmann::json top3 = nlohmann::json::array();
    for (const auto& kv : c.top3) {
        top3.push_back({{"char", kv.first}, {"confidence", kv.second}});
    }
    return {
        {"cell_idx", c.cell_idx},
        {"char", c.ch},
        {"confidence", c.confidence},
        {"is_empty", c.is_empty},
        {"top3", std::move(top3)},
        {"bbox", {c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3]}},
    };
}

}  // namespace

extern "C" {

JNIEXPORT jlong JNICALL
Java_expo_modules_ocrnative_NativeBlankScannerBridge_nativeCreate(
    JNIEnv* env,
    jobject /* thiz */,
    jstring j_model_path,
    jstring j_spec_path) {
    try {
        std::string model_path = jstring_to_utf8(env, j_model_path);
        std::string spec_path = jstring_to_utf8(env, j_spec_path);
        auto handle = std::make_unique<ScannerHandle>(model_path, spec_path);

        // Warm up ONNX Runtime session with one 64x64 synthetic cell in native memory (freed immediately).
        cv::Mat warmup_cell(64, 64, CV_8UC3, cv::Scalar(245, 245, 245));
        cv::line(warmup_cell, cv::Point(18, 16), cv::Point(46, 48), cv::Scalar(30, 30, 30), 3);
        (void)handle->scanner.classify_cell(warmup_cell, -1.0, 3, true, false);
        warmup_cell.release();

        __android_log_print(ANDROID_LOG_INFO, kLogTag,
                            "Initialized NativeBlankScanner (alphabet=%zu)",
                            handle->scanner.spec().alphabet.size());
        return reinterpret_cast<jlong>(handle.release());
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, kLogTag, "nativeCreate failed: %s", e.what());
        throw_java_runtime(env, e.what());
        return 0L;
    }
}

JNIEXPORT void JNICALL
Java_expo_modules_ocrnative_NativeBlankScannerBridge_nativeDestroy(
    JNIEnv* /* env */,
    jobject /* thiz */,
    jlong ptr) {
    if (ptr != 0L) {
        auto* handle = reinterpret_cast<ScannerHandle*>(ptr);
        delete handle;
    }
}

JNIEXPORT jstring JNICALL
Java_expo_modules_ocrnative_NativeBlankScannerBridge_nativeDetectMarkers(
    JNIEnv* env,
    jobject /* thiz */,
    jlong ptr,
    jlong mat_addr,
    jint pad) {
    if (ptr == 0L || mat_addr == 0L) {
        throw_java_runtime(env, "SCANNER_OR_MAT_NULL");
        return nullptr;
    }
    try {
        auto* handle = reinterpret_cast<ScannerHandle*>(ptr);
        std::unique_lock<std::mutex> lock(handle->mtx, std::try_to_lock);
        if (!lock.owns_lock()) {
            // Capture/process_blank is running; skip viewfinder frame without blocking.
            return env->NewStringUTF("{\"busy\":true,\"markers\":{}}");
        }
        const auto& img = *reinterpret_cast<const cv::Mat*>(mat_addr);
        if (img.empty()) {
            return env->NewStringUTF("{\"markers\":{}}");
        }
        auto marker_map = handle->scanner.detect_markers_padded(img, static_cast<int>(pad));
        nlohmann::json markers = nlohmann::json::object();
        for (const auto& [id, pts] : marker_map) {
            nlohmann::json corners = nlohmann::json::array();
            for (int k = 0; k < pts.rows; ++k) {
                corners.push_back({pts.at<float>(k, 0), pts.at<float>(k, 1)});
            }
            markers[std::to_string(id)] = std::move(corners);
        }
        nlohmann::json out = {{"markers", std::move(markers)}};
        std::string dumped = out.dump();
        return env->NewStringUTF(dumped.c_str());
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_WARN, kLogTag, "nativeDetectMarkers error: %s", e.what());
        throw_java_runtime(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jstring JNICALL
Java_expo_modules_ocrnative_NativeBlankScannerBridge_nativeProcessBlank(
    JNIEnv* env,
    jobject /* thiz */,
    jlong ptr,
    jlong bgr_mat_addr,
    jlong out_rectified_mat_addr) {
    if (ptr == 0L || bgr_mat_addr == 0L) {
        throw_java_runtime(env, "SCANNER_OR_MAT_NULL");
        return nullptr;
    }
    try {
        auto* handle = reinterpret_cast<ScannerHandle*>(ptr);
        const auto& img_bgr = *reinterpret_cast<const cv::Mat*>(bgr_mat_addr);
        if (img_bgr.empty()) {
            throw_java_runtime(env, "IMAGE_UNREADABLE");
            return nullptr;
        }

        std::lock_guard<std::mutex> lock(handle->mtx);
        auto t0 = std::chrono::steady_clock::now();
        tatar_ocr::BlankResult res = handle->scanner.process_blank(img_bgr);
        auto t1 = std::chrono::steady_clock::now();
        double elapsed_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

        if (out_rectified_mat_addr != 0L && !res.rectified_bgr.empty()) {
            *reinterpret_cast<cv::Mat*>(out_rectified_mat_addr) = res.rectified_bgr;
        }
        // Release our reference to rectified pixels immediately (ADR 0003).
        res.rectified_bgr.release();

        const auto& spec = handle->scanner.spec();
        nlohmann::json name_cells = nlohmann::json::array();
        for (const auto& c : res.student_name_cells) {
            name_cells.push_back(serialize_cell(c));
        }

        nlohmann::json questions = nlohmann::json::array();
        for (const auto& q : res.questions) {
            nlohmann::json q_cells = nlohmann::json::array();
            for (const auto& c : q.cells) {
                q_cells.push_back(serialize_cell(c));
            }
            questions.push_back({
                {"q_num", q.q_num},
                {"marker_id", spec.question_marker_base_id + q.q_num},
                {"text", q.text},
                {"cells", std::move(q_cells)},
            });
        }

        nlohmann::json payload = {
            {"status", res.status},
            {"rectification_method", res.rectification_method},
            {"alphabet", spec.alphabet},
            {"student_name", res.student_name},
            {"student_name_cells", std::move(name_cells)},
            {"questions", std::move(questions)},
            {"stats", {
                {"total_letters", res.stats.total_letters},
                {"avg_confidence", res.stats.avg_confidence},
                {"questions_count", res.stats.questions_count},
            }},
            {"process_blank_ms", elapsed_ms},
        };

        std::string dumped = payload.dump();
        return env->NewStringUTF(dumped.c_str());
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, kLogTag, "nativeProcessBlank error: %s", e.what());
        throw_java_runtime(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jstring JNICALL
Java_expo_modules_ocrnative_NativeBlankScannerBridge_nativeClassifyCell(
    JNIEnv* env,
    jobject /* thiz */,
    jlong ptr,
    jlong cell_mat_addr) {
    if (ptr == 0L || cell_mat_addr == 0L) {
        throw_java_runtime(env, "SCANNER_OR_MAT_NULL");
        return nullptr;
    }
    try {
        auto* handle = reinterpret_cast<ScannerHandle*>(ptr);
        const auto& cell = *reinterpret_cast<const cv::Mat*>(cell_mat_addr);
        std::lock_guard<std::mutex> lock(handle->mtx);
        tatar_ocr::CellResult res = handle->scanner.classify_cell(cell, -1.0, 3, false, false);
        nlohmann::json top3 = nlohmann::json::array();
        for (const auto& kv : res.top3) {
            top3.push_back({{"char", kv.first}, {"confidence", kv.second}});
        }
        nlohmann::json payload = {
            {"is_empty", res.is_empty},
            {"char", res.ch},
            {"confidence", res.confidence},
            {"top3", std::move(top3)},
        };
        std::string dumped = payload.dump();
        return env->NewStringUTF(dumped.c_str());
    } catch (const std::exception& e) {
        throw_java_runtime(env, e.what());
        return nullptr;
    }
}

}  // extern "C"

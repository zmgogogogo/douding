"""
ML 模型管理器 — PaddleSeg / RetinaFace / PaddleOCR
集中管理模型加载、下载、回退
"""
import os
import numpy as np
from config import MODELS_DIR, HUMANSEG_MODEL_PATH, RETINAFACE_MODEL_PATH, PADDLEOCR_MODEL_PATH

# --- 模型状态缓存 ---
_model_cache = {}


def _ensure_model_dir():
    """确保模型目录存在"""
    MODELS_DIR.mkdir(exist_ok=True)


def get_segmentation_model():
    """
    获取语义分割模型
    优先级: PaddleSeg ONNX → MODNet ONNX → None (回退到OpenCV)
    """
    if 'segmentation' in _model_cache:
        return _model_cache['segmentation']

    model = None

    # 尝试 ONNX Runtime + PaddleSeg 模型
    try:
        import onnxruntime as ort
        model_path = HUMANSEG_MODEL_PATH / "pp_humanseg_v2.onnx"
        if model_path.exists():
            session = ort.InferenceSession(str(model_path))
            model = {'type': 'paddleseg_onnx', 'session': session}
            print("[ML] PaddleSeg ONNX 模型已加载")
            _model_cache['segmentation'] = model
            return model
    except Exception as e:
        print(f"[ML] PaddleSeg ONNX 不可用: {e}")

    # 尝试 MODNet ONNX
    try:
        import onnxruntime as ort
        modnet_path = MODELS_DIR / "modnet.onnx"
        if modnet_path.exists():
            session = ort.InferenceSession(str(modnet_path))
            model = {'type': 'modnet_onnx', 'session': session}
            print("[ML] MODNet ONNX 模型已加载")
    except Exception as e:
        print(f"[ML] MODNet ONNX 不可用: {e}")

    _model_cache['segmentation'] = model  # 可能是 None → 回退
    return model


def get_face_model():
    """
    获取人脸检测模型
    优先级: RetinaFace → dlib → OpenCV Haar
    """
    if 'face' in _model_cache:
        return _model_cache['face']

    model = None

    # 尝试 RetinaFace
    try:
        from retinaface import RetinaFace
        model = {'type': 'retinaface', 'detector': RetinaFace}
        print("[ML] RetinaFace 已加载")
        _model_cache['face'] = model
        return model
    except ImportError:
        print("[ML] RetinaFace 未安装")

    # 尝试 dlib
    try:
        import dlib
        predictor_path = MODELS_DIR / "shape_predictor_68_face_landmarks.dat"
        detector = dlib.get_frontal_face_detector()
        if predictor_path.exists():
            predictor = dlib.shape_predictor(str(predictor_path))
            model = {'type': 'dlib_68', 'detector': detector, 'predictor': predictor}
            print("[ML] dlib 68点关键点 已加载")
        else:
            model = {'type': 'dlib_hog', 'detector': detector}
            print("[ML] dlib HOG 人脸检测 已加载（无68点模型）")
    except ImportError:
        print("[ML] dlib 未安装")
    except Exception as e:
        print(f"[ML] dlib 加载失败: {e}")

    _model_cache['face'] = model
    return model


def get_ocr_model():
    """
    获取 OCR 模型
    优先级: PaddleOCR → None (回退到MSER)
    """
    if 'ocr' in _model_cache:
        return _model_cache['ocr']

    model = None

    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            use_gpu=False,
            show_log=False,
            det_model_dir=str(PADDLEOCR_MODEL_PATH / "det"),
            rec_model_dir=str(PADDLEOCR_MODEL_PATH / "rec"),
        )
        model = {'type': 'paddleocr', 'ocr': ocr}
        print("[ML] PaddleOCR 已加载")
    except ImportError:
        print("[ML] PaddleOCR 未安装")
    except Exception as e:
        print(f"[ML] PaddleOCR 加载失败: {e}")

    _model_cache['ocr'] = model
    return model


def download_model_instructions():
    """
    打印模型下载说明
    """
    print("""
=== ML 模型下载说明 ===

1. PaddleSeg 人像分割 (可选):
   wget https://paddleseg.bj.bcebos.com/dygraph/ppseg/ppseg_lite_portrait_398x224_with_softmax.tar.gz
   tar -xzf ppseg_lite_portrait_398x224_with_softmax.tar.gz -C {HUMANSEG_MODEL_PATH}

2. MODNet 轻量抠图 (可选):
   wget https://github.com/ZHKKKe/MODNet/releases/download/pretrained/modnet_photographic_portrait_matting.onnx
   mv modnet_photographic_portrait_matting.onnx {MODELS_DIR}/modnet.onnx

3. RetinaFace (pip):
   pip install retina-face

4. dlib 68点关键点 (可选):
   wget https://github.com/davisking/dlib-models/raw/master/shape_predictor_68_face_landmarks.dat.bz2
   bunzip2 shape_predictor_68_face_landmarks.dat.bz2
   mv shape_predictor_68_face_landmarks.dat {MODELS_DIR}/

5. PaddleOCR (pip):
   pip install paddleocr
   (首次运行自动下载模型文件)

当前状态：所有模型均支持优雅回退到 OpenCV 方案。
无 ML 模型也能正常转图，只是分割精度略低。
""".format(HUMANSEG_MODEL_PATH=HUMANSEG_MODEL_PATH, MODELS_DIR=MODELS_DIR))

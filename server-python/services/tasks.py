"""
Celery 异步任务 — 替换 threading 方案
文档规范：Celery + Redis 处理大尺寸图片，避免超时
"""
import time
import cv2
import numpy as np

# Celery 配置（延迟加载，避免导入时就需要 Redis）
_celery_app = None


def get_celery_app():
    """
    延迟初始化 Celery
    - 有 Redis → Celery 生产模式
    - 无 Redis → threading 开发模式
    """
    global _celery_app
    if _celery_app is not None:
        return _celery_app

    # 检查 Redis 是否可用
    redis_ok = False
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=1)
        r.ping()
        redis_ok = True
    except Exception:
        pass

    if redis_ok:
        try:
            from celery import Celery
            app = Celery('douding_convert',
                broker='redis://localhost:6379/0',
                backend='redis://localhost:6379/1'
            )
            app.conf.update(
                task_serializer='json',
                result_serializer='json',
                accept_content=['json'],
                timezone='Asia/Shanghai',
                enable_utc=True,
                task_track_started=True,
            )
            _celery_app = app
            print("[Celery] ✅ Redis 已连接，异步任务队列就绪")
            return app
        except ImportError:
            print("[Celery] 未安装")
        except Exception as e:
            print(f"[Celery] 初始化失败: {e}")

    # 开发模式：threading
    print("[Task] 使用 threading（开发模式，安装 Redis 后自动切换 Celery）")
    _celery_app = False
    return None


def submit_convert_task(file_bytes: bytes, params: dict) -> str:
    """
    提交转图任务
    Celery 可用时注册为 Celery 任务，否则使用 threading 回退

    Returns:
        task_id: str
    """
    import uuid
    task_id = str(uuid.uuid4())

    app = get_celery_app()
    if app:
        # Celery 异步任务
        @app.task(bind=True, name=f'douding.convert.{task_id[:8]}')
        def convert_task(self, tid, fb, p):
            _run_convert(tid, fb, p)
        convert_task.delay(task_id, file_bytes, params)
    else:
        # threading 回退（开发环境）
        import threading
        from routes.convert import task_store
        task_store[task_id] = {'status': 'pending', 'progress': 0, 'createdAt': time.time()}
        thread = threading.Thread(target=_run_convert, args=(task_id, file_bytes, params), daemon=True)
        thread.start()

    return task_id


def _run_convert(task_id, file_bytes, params):
    """实际执行转图任务（Celery 和 threading 共用）"""
    import sys
    sys.path.insert(0, '/Users/h/first-cc/server-python')
    from routes.convert import task_store

    try:
        if task_id in task_store:
            task_store[task_id]['status'] = 'processing'
            task_store[task_id]['progress'] = 10

        img_array = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError('无法解析图片')
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        if task_id in task_store:
            task_store[task_id]['progress'] = 30

        from routes.convert import _image_to_grid
        tw = params.get('targetWidth', 58)
        th = params.get('targetHeight', 0)
        brand = params.get('brand')
        if th <= 0:
            h, w = image.shape[:2]
            th = int(tw * h / w)

        result = _image_to_grid(image, tw, th, brand, params)

        if task_id in task_store:
            task_store[task_id]['status'] = 'success'
            task_store[task_id]['progress'] = 100
            task_store[task_id]['result'] = result

        return result

    except Exception as e:
        if task_id in task_store:
            task_store[task_id]['status'] = 'fail'
            task_store[task_id]['error'] = str(e)
        print(f"❌ 任务 {task_id[:8]} 失败: {e}")
        raise

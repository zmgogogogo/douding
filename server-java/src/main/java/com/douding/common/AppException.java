package com.douding.common;

import lombok.Getter;

/**
 * 业务异常类 — 替代 Express 中的 AppError
 */
@Getter
public class AppException extends RuntimeException {

    private final int code;

    public AppException(int code, String message) {
        super(message);
        this.code = code;
    }

    public AppException(String message) {
        this(400, message);
    }

    /** 404 */
    public static AppException notFound(String message) {
        return new AppException(404, message);
    }

    /** 401 */
    public static AppException unauthorized(String message) {
        return new AppException(401, message);
    }

    /** 403 */
    public static AppException forbidden(String message) {
        return new AppException(403, message);
    }

    /** 400 */
    public static AppException badRequest(String message) {
        return new AppException(400, message);
    }
}

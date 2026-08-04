package com.douding.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一响应格式 — 与前端约定 { code, data, message } 保持一致
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> {

    /** 状态码：200 成功，4xx/5xx 失败 */
    private int code;

    /** 响应数据 */
    private T data;

    /** 提示消息 */
    private String message;

    // ========== 静态工厂方法 ==========

    /** 成功（无数据） */
    public static <T> Result<T> success() {
        return new Result<>(200, null, null);
    }

    /** 成功（带数据） */
    public static <T> Result<T> success(T data) {
        return new Result<>(200, data, null);
    }

    /** 成功（带数据和消息） */
    public static <T> Result<T> success(T data, String message) {
        return new Result<>(200, data, message);
    }

    /** 失败 */
    public static <T> Result<T> fail(int code, String message) {
        return new Result<>(code, null, message);
    }

    /** 分页响应 */
    public static <T> Result<PageData<T>> paginated(java.util.List<T> list, long total, int page, int pageSize) {
        return success(new PageData<>(list, total, page, pageSize));
    }

    /**
     * 分页数据内部类
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PageData<T> {
        private java.util.List<T> list;
        private long total;
        private int page;
        private int pageSize;
    }
}

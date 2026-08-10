package com.douding.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.util.Enumeration;

/**
 * Python 后端代理控制器 — 转发图像处理请求到 Python FastAPI (3457)
 * 对应 Express 中的 proxyToPython 中间件
 */
@Slf4j
@RestController
public class PythonProxyController {

    @Value("${douding.python.host:localhost}")
    private String pythonHost;

    @Value("${douding.python.port:3457}")
    private int pythonPort;

    /** 代理 /api/image-to-grid 和 /api/convert 到 Python 后端 */
    @RequestMapping({"/api/image-to-grid", "/api/convert"})
    public void proxy(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String targetUrl = "http://" + pythonHost + ":" + pythonPort + request.getRequestURI()
                + (request.getQueryString() != null ? "?" + request.getQueryString() : "");

        HttpURLConnection conn = null;
        try {
            URL url = new URL(targetUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod(request.getMethod());
            conn.setConnectTimeout(60000);
            conn.setReadTimeout(120000);

            // 转发请求头
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                if ("host".equalsIgnoreCase(name)) continue;
                conn.setRequestProperty(name, request.getHeader(name));
            }

            // 转发请求体（multipart）
            if (request.getContentLengthLong() > 0) {
                conn.setDoOutput(true);
                try (InputStream inputStream = request.getInputStream();
                     OutputStream outputStream = conn.getOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                }
            }

            // 读取响应
            int statusCode = conn.getResponseCode();
            response.setStatus(statusCode);

            // 转发响应头
            conn.getHeaderFields().forEach((key, values) -> {
                if (key != null && !"Transfer-Encoding".equalsIgnoreCase(key)) {
                    values.forEach(v -> response.addHeader(key, v));
                }
            });

            // 转发响应体
            try (InputStream responseStream = (statusCode >= 400 ? conn.getErrorStream() : conn.getInputStream())) {
                if (responseStream != null) {
                    try (OutputStream out = response.getOutputStream()) {
                        byte[] buffer = new byte[8192];
                        int bytesRead;
                        while ((bytesRead = responseStream.read(buffer)) != -1) {
                            out.write(buffer, 0, bytesRead);
                        }
                    }
                }
            }
        } catch (SocketTimeoutException e) {
            log.error("Python 代理请求超时: {}", e.getMessage());
            if (!response.isCommitted()) {
                response.setStatus(504);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":504,\"message\":\"转换超时，请尝试使用更少的颜色数（建议 ≤16）或降低图片尺寸\"}");
            }
        } catch (IOException e) {
            log.error("Python 代理请求失败: {}", e.getMessage());
            if (!response.isCommitted()) {
                response.setStatus(502);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":502,\"message\":\"Python 转换服务未启动，请确保 Python 后端运行在端口 "
                        + pythonPort + "\"}");
            }
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) {}
            }
        }
    }
}

package com.douding.config;

import com.douding.websocket.CollaborationHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket 配置 — 替代 server/ws/index.js
 * 协作绘图实时同步
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CollaborationHandler collaborationHandler;

    public WebSocketConfig(CollaborationHandler collaborationHandler) {
        this.collaborationHandler = collaborationHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(collaborationHandler, "/ws/collaboration")
                .setAllowedOrigins("*");
    }
}

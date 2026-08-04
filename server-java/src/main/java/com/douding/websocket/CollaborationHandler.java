package com.douding.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 协作 WebSocket 处理器 — 替代 server/ws/collaboration.js
 * 管理设计协作会话，广播绘图操作
 */
@Slf4j
@Component
public class CollaborationHandler extends TextWebSocketHandler {

    /** 设计 ID → 参与的 WebSocket 会话集合 */
    private final Map<String, Map<String, WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket 连接建立: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        // 解析消息中的 designId，广播给同房间的其他用户
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> msg = new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map.class);
            String designId = msg.get("designId") != null ? msg.get("designId").toString() : null;
            String type = msg.get("type") != null ? msg.get("type").toString() : "";

            if ("join".equals(type) && designId != null) {
                rooms.computeIfAbsent(designId, k -> new ConcurrentHashMap<>())
                        .put(session.getId(), session);
                log.info("用户加入协作房间: designId={}, sessionId={}", designId, session.getId());
            } else if ("leave".equals(type) && designId != null) {
                Map<String, WebSocketSession> room = rooms.get(designId);
                if (room != null) room.remove(session.getId());
            } else if (designId != null) {
                // 广播给房间内其他用户
                Map<String, WebSocketSession> room = rooms.get(designId);
                if (room != null) {
                    TextMessage broadcast = new TextMessage(payload);
                    for (var entry : room.entrySet()) {
                        if (!entry.getKey().equals(session.getId()) && entry.getValue().isOpen()) {
                            entry.getValue().sendMessage(broadcast);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("WebSocket 消息处理失败: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket 连接关闭: {}", session.getId());
        // 清理所有房间中的该会话
        rooms.values().forEach(room -> room.remove(session.getId()));
    }
}

package com.douding.service;

import com.douding.common.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 短信验证码服务 — 阿里云短信 HTTP API
 * 限流: 同手机60秒/次, 同IP 5次/时, 同手机 10次/天
 * 未配置 AK 时仅打印验证码到日志（开发模式）
 */
@Slf4j
@Service
public class SmsService {

    private final StringRedisTemplate redis;
    private final String akId;
    private final String akSecret;
    private final String signName;
    private final String templateCode;

    public SmsService(StringRedisTemplate redis,
                      @Value("${douding.sms.access-key-id:}") String akId,
                      @Value("${douding.sms.access-key-secret:}") String akSecret,
                      @Value("${douding.sms.sign-name:豆丁}") String signName,
                      @Value("${douding.sms.template-code:}") String templateCode) {
        this.redis = redis;
        this.akId = akId;
        this.akSecret = akSecret;
        this.signName = signName;
        this.templateCode = templateCode;
        if (akId.isBlank()) log.warn("未配置阿里云短信 AK，短信将仅打印到日志");
    }

    private boolean isDev() { return akId.isBlank(); }

    /** 发送验证码 */
    public void sendCode(String phone, String ip) {
        if (!phone.matches("^1[3-9]\\d{9}$")) throw AppException.badRequest("手机号格式不正确");

        // 防刷
        String rateKey = "sms:limit:" + phone;
        if (Boolean.TRUE.equals(redis.hasKey(rateKey)))
            throw AppException.badRequest("发送过于频繁，请60秒后再试");

        String dayKey = "sms:day:" + phone;
        String dayCount = redis.opsForValue().get(dayKey);
        if (dayCount != null && Integer.parseInt(dayCount) >= 10)
            throw AppException.badRequest("今日发送次数已用完");
        redis.opsForValue().increment(dayKey, 1);
        redis.expire(dayKey, 1, TimeUnit.DAYS);

        String ipKey = "sms:ip:" + ip;
        String ipCount = redis.opsForValue().get(ipKey);
        if (ipCount != null && Integer.parseInt(ipCount) >= 5)
            throw AppException.badRequest("IP请求过于频繁");
        redis.opsForValue().increment(ipKey, 1);
        redis.expire(ipKey, 1, TimeUnit.HOURS);

        String code = String.format("%06d", new Random().nextInt(1000000));
        redis.opsForValue().set("sms:code:" + phone, code, 5, TimeUnit.MINUTES);
        redis.opsForValue().set(rateKey, "1", 60, TimeUnit.SECONDS);

        if (isDev()) {
            log.info("[SMS] 开发模式 验证码: {} -> {}", phone, code);
            return;
        }

        try {
            String resp = callAliSms(phone, code);
            log.info("[SMS] API响应: {} -> {} resp: {}", phone, code, resp);
            if (resp.contains("\"Code\":\"OK\"") || resp.contains("\"Success\":true")) return;
            log.error("[SMS] 发送失败: {}", resp);
            redis.delete("sms:code:" + phone);
            redis.delete(rateKey);
            throw AppException.badRequest("短信发送失败，请稍后重试");
        } catch (AppException e) { throw e;
        } catch (Exception e) {
            log.error("[SMS] 发送异常: {}", e.getMessage());
            redis.delete("sms:code:" + phone);
            redis.delete(rateKey);
            throw AppException.badRequest("短信发送失败，请稍后重试");
        }
    }

    /** 调用阿里云短信 API */
    private String callAliSms(String phone, String code) throws Exception {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("PhoneNumber", phone);
        params.put("SignName", signName);
        params.put("TemplateCode", templateCode);
        params.put("TemplateParam", "{\"code\":\"" + code + "\",\"min\":\"5\"}");
        params.put("AccessKeyId", akId);
        params.put("Action", "SendSmsVerifyCode");
        params.put("Version", "2017-05-25");
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        params.put("Timestamp", sdf.format(new Date()));
        params.put("Format", "JSON");
        params.put("SignatureMethod", "HMAC-SHA1");
        params.put("SignatureVersion", "1.0");
        params.put("SignatureNonce", UUID.randomUUID().toString());
        params.put("RegionId", "cn-hangzhou");

        // 签名
        String signature = sign(params, akSecret + "&");

        // 构建 URL（PNVS 使用 dypnsapi 端点）
        StringBuilder url = new StringBuilder("https://dypnsapi.aliyuncs.com/?");
        params.put("Signature", signature);
        for (Map.Entry<String, String> e : params.entrySet()) {
            url.append(percentEncode(e.getKey()))
               .append("=")
               .append(percentEncode(e.getValue()))
               .append("&");
        }
        url.setLength(url.length() - 1); // 去掉末尾 &
        // 用 HttpURLConnection 直接发送，绕过 Spring 的 URI 校验
        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URL(url.toString()).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        if (conn.getResponseCode() == 200) {
            return new String(conn.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } else {
            return new String(conn.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** HMAC-SHA1 签名 */
    private String sign(Map<String, String> params, String keySecret) throws Exception {
        String[] sortedKeys = params.keySet().toArray(new String[0]);
        Arrays.sort(sortedKeys);
        StringBuilder canonical = new StringBuilder();
        for (String k : sortedKeys) {
            canonical.append("&").append(percentEncode(k)).append("=").append(percentEncode(params.get(k)));
        }
        String stringToSign = "GET&" + percentEncode("/") + "&" + percentEncode(canonical.substring(1));
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
        return Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8)));
    }

    private String percentEncode(String s) throws Exception {
        return URLEncoder.encode(s, StandardCharsets.UTF_8)
                .replace("+", "%20").replace("*", "%2A").replace("%7E", "~")
                .replace("%3D", "%3D"); // 已正确编码
    }

    /** 校验验证码 */
    public boolean verifyCode(String phone, String code) {
        if (phone == null || code == null) return false;
        String cached = redis.opsForValue().get("sms:code:" + phone);
        if (cached != null && cached.equals(code)) {
            redis.delete("sms:code:" + phone);
            return true;
        }
        return false;
    }
}

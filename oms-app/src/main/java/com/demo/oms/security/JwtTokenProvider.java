package com.demo.oms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${security.jwt.secret:oms-bangladesh-very-secret-key-2024-production-change-this-256bit-long-string}")
    private String secret;

    @Value("${security.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private SecretKey key() {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // ensure at least 256 bits for HMAC-SHA256
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, bytes.length);
            return Keys.hmacShaKeyFor(padded);
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String generateToken(String username, String role, String accountId) {
        return Jwts.builder()
                .subject(username)
                .claims(Map.of(
                    "role", role,
                    "accountId", accountId != null ? accountId : ""))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public String getUsername(String token) {
        return parseToken(token).getSubject();
    }

    public String getRole(String token) {
        return (String) parseToken(token).get("role");
    }

    public String getAccountId(String token) {
        return (String) parseToken(token).get("accountId");
    }
}

package org.example.backend.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.model.entity.User;
import org.example.backend.repository.InvalidatedTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    /** Chuỗi Base64 của khóa HMAC. Không có giá trị mặc định: thiếu biến môi trường thì app không khởi động. */
    @Value("${application.security.jwt.secret-key}")
    private String secretKey;

    /** Mặc định 15 phút. */
    @Value("${application.security.jwt.expiration-ms:900000}")
    private long jwtExpirationMs;

    private final InvalidatedTokenRepository invalidatedTokenRepository;

    private volatile SecretKey signingKey;

    public JwtService(InvalidatedTokenRepository invalidatedTokenRepository) {
        this.invalidatedTokenRepository = invalidatedTokenRepository;
    }

    public static String hashToken(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng trên hệ thống", e);
        }
    }

    public long getJwtExpirationMs() {
        return jwtExpirationMs;
    }

    public String generateToken(User user) {
        return generateToken(new HashMap<>(), user);
    }

    public String generateToken(Map<String, Object> extraClaims, User user) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.put("userId", user.getId());
        claims.put("email", user.getEmail());
        if (user.getRole() != null) {
            claims.put("role", user.getRole().name());
        }

        String jti = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .id(jti)
                .subject(user.getUsername())
                .claims(claims)
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtExpirationMs))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        Object userId = claims.get("userId");
        if (userId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        return (String) claims.get("role");
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Instant extractExpirationInstant(String token) {
        Date expiration = extractExpiration(token);
        return expiration != null ? expiration.toInstant() : Instant.now().plusMillis(jwtExpirationMs);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /** Parse + kiểm tra chữ ký + hạn dùng (ném JwtException nếu không hợp lệ). */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Parse token đúng MỘT lần và kiểm tra blacklist (1 truy vấn DB theo jti).
     * Trả về Optional.empty() nếu token sai chữ ký, hết hạn hoặc đã bị thu hồi khi đăng xuất.
     */
    public Optional<Claims> parseValidClaims(String token) {
        try {
            Claims claims = extractAllClaims(token);
            String jti = claims.getId();
            if (jti == null || invalidatedTokenRepository.existsById(jti)) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token JWT không hợp lệ: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean validateToken(String token) {
        return parseValidClaims(token).isPresent();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            boolean usernameMatches = username != null && (username.equals(userDetails.getUsername())
                    || (userDetails instanceof User u && (username.equals(u.getUsername()) || username.equals(u.getEmail()))));
            return usernameMatches && validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    private SecretKey getSigningKey() {
        SecretKey key = signingKey;
        if (key == null) {
            byte[] keyBytes = Decoders.BASE64.decode(secretKey);
            // Ném WeakKeyException nếu khóa < 256 bit -> phát hiện cấu hình yếu ngay lần dùng đầu tiên
            key = Keys.hmacShaKeyFor(keyBytes);
            signingKey = key;
        }
        return key;
    }
}
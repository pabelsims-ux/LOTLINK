package com.lotolink.banca;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

/**
 * Lotolink Integration Example - Java
 * 
 * Este ejemplo muestra cómo integrar una banca con Lotolink.
 * Compatible con Java 11+ (usa HttpClient nativo).
 */
public class LotolinkIntegration {

    // ============================================================
    // CONFIGURACIÓN (Obtener de Lotolink)
    // ============================================================
    
    private final String hmacSecret;
    private final String webhookUrl;
    private final HttpClient httpClient;

    public LotolinkIntegration() {
        this.hmacSecret = System.getenv("LOTOLINK_HMAC_SECRET");
        this.webhookUrl = System.getenv("LOTOLINK_WEBHOOK_URL");
        this.httpClient = HttpClient.newHttpClient();
        
        if (this.hmacSecret == null || this.webhookUrl == null) {
            System.err.println("⚠️ Configurar LOTOLINK_HMAC_SECRET y LOTOLINK_WEBHOOK_URL");
        }
    }

    // ============================================================
    // HMAC SIGNATURE UTILITIES
    // ============================================================

    /**
     * Genera firma HMAC-SHA256 para webhooks
     */
    public String signRequest(String method, String path, String timestamp, String body) throws Exception {
        String signatureBase = method + path + timestamp + body;
        
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(hmacSecret.getBytes(), "HmacSHA256");
        mac.init(keySpec);
        
        byte[] hash = mac.doFinal(signatureBase.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }

    /**
     * Verifica firma HMAC de requests entrantes
     */
    public boolean verifySignature(String method, String path, String timestamp, String body, String signature) {
        try {
            String expectedSignature = signRequest(method, path, timestamp, body);
            return MessageDigest.isEqual(
                expectedSignature.getBytes(),
                signature.getBytes()
            );
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Valida timestamp del request (±120 segundos)
     */
    public boolean validateTimestamp(String timestamp) {
        try {
            Instant requestTime = Instant.parse(timestamp);
            Instant now = Instant.now();
            long diffSeconds = Math.abs(ChronoUnit.SECONDS.between(requestTime, now));
            return diffSeconds <= 120;
        } catch (Exception e) {
            return false;
        }
    }

    // ============================================================
    // WEBHOOK: Enviar confirmación a Lotolink
    // ============================================================

    /**
     * Envía confirmación de jugada a Lotolink
     */
    public boolean sendWebhookConfirmation(
            String requestId,
            String status,
            String ticketCode,
            String message
    ) {
        try {
            String timestamp = Instant.now().toString();
            String path = "/webhooks/plays/confirmation";
            
            String body = String.format(
                "{\"request_id\":\"%s\",\"play_id_banca\":\"BANCA_%d\",\"status\":\"%s\",\"ticket_code\":%s,\"message\":%s,\"timestamp\":\"%s\"}",
                requestId,
                System.currentTimeMillis(),
                status,
                ticketCode != null ? "\"" + ticketCode + "\"" : "null",
                message != null ? "\"" + message + "\"" : "null",
                timestamp
            );
            
            String signature = signRequest("POST", path, timestamp, body);
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .header("Content-Type", "application/json")
                .header("X-Signature", signature)
                .header("X-Timestamp", timestamp)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            
            if (response.statusCode() == 200) {
                System.out.println("✅ Webhook enviado exitosamente para " + requestId);
                return true;
            } else {
                System.err.println("❌ Error en webhook: HTTP " + response.statusCode());
                return false;
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error enviando webhook: " + e.getMessage());
            return false;
        }
    }

    // ============================================================
    // EJEMPLO DE USO
    // ============================================================

    public static void main(String[] args) {
        LotolinkIntegration lotolink = new LotolinkIntegration();
        
        // Ejemplo: Enviar confirmación de jugada
        boolean success = lotolink.sendWebhookConfirmation(
            "550e8400-e29b-41d4-a716-446655440000", // request_id
            "confirmed",                              // status
            "TKT-ABC12345",                          // ticket_code
            "Jugada confirmada exitosamente"         // message
        );
        
        System.out.println("Resultado: " + (success ? "Éxito" : "Fallo"));
    }
}

// ============================================================
// EJEMPLO DE SERVLET (Spring Boot / Jakarta EE)
// ============================================================

/*
// Para Spring Boot, usar este controlador:

@RestController
@RequestMapping("/v1/plays")
public class BancaPlayController {

    private final LotolinkIntegration lotolink = new LotolinkIntegration();

    @PostMapping("/register")
    public ResponseEntity<?> registerPlay(
            @RequestHeader("X-Signature") String signature,
            @RequestHeader("X-Timestamp") String timestamp,
            @RequestBody String body
    ) {
        // 1. Validar timestamp
        if (!lotolink.validateTimestamp(timestamp)) {
            return ResponseEntity.status(401).body(Map.of("error", "Timestamp out of range"));
        }

        // 2. Verificar firma
        if (!lotolink.verifySignature("POST", "/v1/plays/register", timestamp, body, signature)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid signature"));
        }

        // 3. Parsear body
        ObjectMapper mapper = new ObjectMapper();
        PlayRequest request = mapper.readValue(body, PlayRequest.class);

        // 4. Procesar jugada...
        String ticketCode = "TKT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 5. Responder
        Map<String, Object> response = new HashMap<>();
        response.put("status", "pending");
        response.put("play_id_banca", "PLAY_" + System.currentTimeMillis());
        response.put("message", "Jugada recibida, procesando...");

        // 6. Enviar webhook (async)
        CompletableFuture.runAsync(() -> {
            lotolink.sendWebhookConfirmation(
                request.getRequestId(),
                "confirmed",
                ticketCode,
                null
            );
        });

        return ResponseEntity.status(201).body(response);
    }
}

// DTO para el request
public class PlayRequest {
    private String requestId;
    private String userId;
    private Play play;
    private Payment payment;
    
    // getters y setters...
}
*/

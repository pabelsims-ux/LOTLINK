<?php
/**
 * Lotolink Integration Example - PHP
 * 
 * Este ejemplo muestra cómo integrar una banca con Lotolink.
 * Compatible con PHP 7.4+ y frameworks como Laravel, Symfony, etc.
 */

// ============================================================
// CONFIGURACIÓN (Obtener de Lotolink)
// ============================================================
define('LOTOLINK_CLIENT_ID', getenv('LOTOLINK_CLIENT_ID') ?: 'your_client_id');
define('LOTOLINK_CLIENT_SECRET', getenv('LOTOLINK_CLIENT_SECRET') ?: 'your_client_secret');
define('LOTOLINK_HMAC_SECRET', getenv('LOTOLINK_HMAC_SECRET') ?: 'your_hmac_secret');
define('LOTOLINK_WEBHOOK_URL', getenv('LOTOLINK_WEBHOOK_URL') ?: 'https://api.lotolink.com/webhooks/plays/confirmation');

// ============================================================
// CLASE PRINCIPAL DE INTEGRACIÓN
// ============================================================

class LotolinkIntegration
{
    private string $hmacSecret;
    private string $webhookUrl;

    public function __construct()
    {
        $this->hmacSecret = LOTOLINK_HMAC_SECRET;
        $this->webhookUrl = LOTOLINK_WEBHOOK_URL;
    }

    /**
     * Genera firma HMAC-SHA256 para webhooks
     */
    public function signRequest(string $method, string $path, string $timestamp, string $body): string
    {
        $signatureBase = $method . $path . $timestamp . $body;
        return base64_encode(hash_hmac('sha256', $signatureBase, $this->hmacSecret, true));
    }

    /**
     * Verifica firma HMAC de requests entrantes
     */
    public function verifySignature(string $method, string $path, string $timestamp, string $body, string $signature): bool
    {
        $expectedSignature = $this->signRequest($method, $path, $timestamp, $body);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Valida request de Lotolink
     * @throws Exception si la validación falla
     */
    public function validateRequest(string $method, string $path): array
    {
        // Obtener headers
        $signature = $_SERVER['HTTP_X_SIGNATURE'] ?? null;
        $timestamp = $_SERVER['HTTP_X_TIMESTAMP'] ?? null;

        if (!$signature || !$timestamp) {
            throw new Exception('Missing signature or timestamp', 401);
        }

        // Validar timestamp (±120 segundos)
        $requestTime = strtotime($timestamp);
        $currentTime = time();
        if (abs($currentTime - $requestTime) > 120) {
            throw new Exception('Timestamp out of range', 401);
        }

        // Obtener body
        $body = file_get_contents('php://input');

        // Verificar firma
        if (!$this->verifySignature($method, $path, $timestamp, $body, $signature)) {
            throw new Exception('Invalid signature', 401);
        }

        return json_decode($body, true);
    }

    /**
     * Envía confirmación de jugada a Lotolink
     */
    public function sendWebhookConfirmation(
        string $requestId,
        string $status,
        ?string $ticketCode = null,
        ?string $message = null
    ): bool {
        $timestamp = gmdate('Y-m-d\TH:i:s\Z');
        $path = '/webhooks/plays/confirmation';

        $body = json_encode([
            'request_id' => $requestId,
            'play_id_banca' => 'BANCA_' . time(),
            'status' => $status, // 'confirmed' | 'rejected' | 'error'
            'ticket_code' => $ticketCode,
            'message' => $message,
            'timestamp' => $timestamp,
        ]);

        $signature = $this->signRequest('POST', $path, $timestamp, $body);

        $ch = curl_init($this->webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Signature: ' . $signature,
                'X-Timestamp: ' . $timestamp,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            error_log("Webhook enviado exitosamente para {$requestId}");
            return true;
        } else {
            error_log("Error en webhook: HTTP {$httpCode}");
            return false;
        }
    }
}

// ============================================================
// CONTROLADOR DE EJEMPLO
// ============================================================

class BancaPlayController
{
    private LotolinkIntegration $lotolink;

    public function __construct()
    {
        $this->lotolink = new LotolinkIntegration();
    }

    /**
     * POST /v1/plays/register
     * Endpoint para recibir jugadas de Lotolink
     */
    public function registerPlay(): void
    {
        header('Content-Type: application/json');

        try {
            // 1. Validar request
            $data = $this->lotolink->validateRequest('POST', '/v1/plays/register');

            $requestId = $data['request_id'];
            $play = $data['play'];

            error_log("Recibida jugada: {$requestId}");
            error_log("Lotería: {$play['lottery_id']}, Modalidad: {$play['modality']}");

            // 2. Verificar idempotencia
            if ($this->playExists($requestId)) {
                http_response_code(409);
                echo json_encode([
                    'status' => 'duplicate',
                    'message' => 'Jugada ya procesada anteriormente'
                ]);
                return;
            }

            // 3. Validar disponibilidad
            if (!$this->checkNumbersAvailable($play['lottery_id'], $play['numbers'])) {
                $this->lotolink->sendWebhookConfirmation($requestId, 'rejected', null, 'Números no disponibles');
                http_response_code(200);
                echo json_encode([
                    'status' => 'rejected',
                    'message' => 'Números no disponibles'
                ]);
                return;
            }

            // 4. Registrar jugada
            $bancaPlayId = $this->savePlay($requestId, $play);
            $ticketCode = $this->generateTicketCode();

            // 5. Responder (aceptada)
            http_response_code(201);
            echo json_encode([
                'status' => 'pending',
                'play_id_banca' => $bancaPlayId,
                'message' => 'Jugada recibida, procesando...'
            ]);

            // 6. Enviar confirmación (en producción, hacer async)
            $this->lotolink->sendWebhookConfirmation($requestId, 'confirmed', $ticketCode);

        } catch (Exception $e) {
            http_response_code($e->getCode() ?: 500);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }

    // Funciones de ejemplo (implementar según tu sistema)
    
    private function playExists(string $requestId): bool
    {
        // TODO: Buscar en tu base de datos
        return false;
    }

    private function checkNumbersAvailable(string $lotteryId, array $numbers): bool
    {
        // TODO: Verificar en tu sistema
        return true;
    }

    private function savePlay(string $requestId, array $play): string
    {
        // TODO: Guardar en tu base de datos
        return 'PLAY_' . time();
    }

    private function generateTicketCode(): string
    {
        return 'TKT-' . strtoupper(substr(md5(uniqid()), 0, 8));
    }
}

// ============================================================
// ROUTER SIMPLE (para testing)
// ============================================================

if (php_sapi_name() !== 'cli') {
    $uri = $_SERVER['REQUEST_URI'];
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST' && strpos($uri, '/v1/plays/register') !== false) {
        $controller = new BancaPlayController();
        $controller->registerPlay();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}

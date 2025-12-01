-- ============================================================
-- LOTOLINK DATABASE MIGRATIONS
-- PostgreSQL 14+
-- 
-- Run with: psql -U lotolink -d lotolink_db -f init.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    wallet_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    wallet_currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================
-- BANCAS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bancas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    integration_type VARCHAR(20) NOT NULL DEFAULT 'api', -- 'api', 'white_label', 'manual'
    api_endpoint VARCHAR(500),
    api_credentials JSONB, -- Encrypted credentials
    hmac_secret VARCHAR(255),
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0500, -- 5%
    supported_lotteries TEXT[] NOT NULL DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bancas_code ON bancas(code);
CREATE INDEX idx_bancas_status ON bancas(status);
CREATE INDEX idx_bancas_integration_type ON bancas(integration_type);

-- ============================================================
-- PLAYS TABLE (Core transaction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS plays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL UNIQUE, -- For idempotency
    user_id UUID NOT NULL REFERENCES users(id),
    banca_id UUID REFERENCES bancas(id),
    lottery_id VARCHAR(50) NOT NULL,
    numbers TEXT[] NOT NULL,
    bet_type VARCHAR(30) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
    payment_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    play_id_banca VARCHAR(100), -- ID from banca system
    ticket_code VARCHAR(100),
    commission_amount DECIMAL(10, 2),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plays_request_id ON plays(request_id);
CREATE INDEX idx_plays_user_id ON plays(user_id);
CREATE INDEX idx_plays_banca_id ON plays(banca_id);
CREATE INDEX idx_plays_status ON plays(status);
CREATE INDEX idx_plays_lottery_id ON plays(lottery_id);
CREATE INDEX idx_plays_created_at ON plays(created_at);

-- ============================================================
-- OUTGOING REQUESTS TABLE (For tracking API calls to bancas)
-- ============================================================
CREATE TABLE IF NOT EXISTS outgoing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    play_id UUID NOT NULL REFERENCES plays(id),
    banca_id UUID NOT NULL REFERENCES bancas(id),
    request_id UUID NOT NULL,
    request_url VARCHAR(500) NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_time_ms INTEGER,
    error_message TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outgoing_requests_play_id ON outgoing_requests(play_id);
CREATE INDEX idx_outgoing_requests_banca_id ON outgoing_requests(banca_id);
CREATE INDEX idx_outgoing_requests_request_id ON outgoing_requests(request_id);

-- ============================================================
-- WEBHOOK EVENTS TABLE (Incoming webhooks from bancas)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    banca_id UUID REFERENCES bancas(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    signature_valid BOOLEAN,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_banca_id ON webhook_events(banca_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

-- ============================================================
-- WALLET TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- 'charge', 'debit', 'refund', 'payout'
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'DOP',
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(30), -- 'play', 'payment', 'manual'
    reference_id UUID,
    payment_gateway_id VARCHAR(100), -- Stripe charge ID, etc.
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_reference_id ON wallet_transactions(reference_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- ============================================================
-- PAYMENT METHODS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    gateway_id VARCHAR(100) NOT NULL, -- Stripe payment method ID
    type VARCHAR(20) NOT NULL, -- 'card', 'bank_account'
    brand VARCHAR(20), -- 'visa', 'mastercard', etc.
    last4 VARCHAR(4) NOT NULL,
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);

-- ============================================================
-- LOTTERY RESULTS TABLE (Cached official results)
-- ============================================================
CREATE TABLE IF NOT EXISTS lottery_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lottery_id VARCHAR(50) NOT NULL,
    lottery_name VARCHAR(100) NOT NULL,
    draw_date DATE NOT NULL,
    draw_number VARCHAR(20),
    winning_numbers TEXT[] NOT NULL,
    bonus_numbers TEXT[],
    jackpot DECIMAL(15, 2),
    currency VARCHAR(3),
    source VARCHAR(100) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_id, draw_date)
);

CREATE INDEX idx_lottery_results_lottery_id ON lottery_results(lottery_id);
CREATE INDEX idx_lottery_results_draw_date ON lottery_results(draw_date);

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================
-- FUNCTION: Update timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bancas_updated_at
    BEFORE UPDATE ON bancas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plays_updated_at
    BEFORE UPDATE ON plays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SAMPLE DATA (for development only)
-- ============================================================
-- Uncomment below for development seeding

-- INSERT INTO bancas (id, name, code, status, integration_type, supported_lotteries)
-- VALUES 
--     (uuid_generate_v4(), 'Banca Demo API', 'BANCA_DEMO_API', 'active', 'api', ARRAY['loteria_nacional', 'leidsa', 'loteka']),
--     (uuid_generate_v4(), 'Banca White Label', 'BANCA_WL', 'active', 'white_label', ARRAY['loteria_nacional', 'real']);

COMMENT ON TABLE plays IS 'Core table for lottery plays/bets';
COMMENT ON TABLE bancas IS 'Lottery banca partners and their configuration';
COMMENT ON TABLE outgoing_requests IS 'Track all API calls to bancas for auditing and debugging';
COMMENT ON TABLE webhook_events IS 'Incoming webhook events from bancas';
COMMENT ON TABLE wallet_transactions IS 'User wallet transaction history';

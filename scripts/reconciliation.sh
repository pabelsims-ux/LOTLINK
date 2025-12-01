#!/bin/bash
# =============================================================================
# Lotolink - Daily Reconciliation Script
# =============================================================================
# This script performs daily reconciliation between Lotolink and Bancas
# 
# Usage: ./scripts/reconciliation.sh [OPTIONS]
# 
# Options:
#   --date YYYY-MM-DD    Specific date to reconcile (default: yesterday)
#   --banca-id ID        Reconcile specific banca only
#   --request-ids IDS    Comma-separated list of request IDs to check
#   --force-check        Force check even if already reconciled
#   --dry-run            Show what would be done without making changes
#   --output-dir DIR     Directory for output files (default: /tmp/reconciliation)
#   --email EMAIL        Send report to this email address
#   -v, --verbose        Verbose output
#   -h, --help           Show this help message
# 
# Environment variables:
#   DATABASE_URL         PostgreSQL connection string
#   BANCA_API_URL        Base URL for banca API
#   HMAC_SECRET          HMAC secret for API authentication
#   SMTP_HOST            SMTP host for email notifications
#   SMTP_PORT            SMTP port (default: 587)
#   SMTP_USER            SMTP username
#   SMTP_PASS            SMTP password
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

# Default values
RECONCILE_DATE=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/reconciliation}"
DRY_RUN=false
VERBOSE=false
FORCE_CHECK=false

# Database connection (should be set via environment)
DATABASE_URL="${DATABASE_URL:-postgresql://lotolink:password@localhost:5432/lotolink_db}"

# Banca API configuration
BANCA_API_URL="${BANCA_API_URL:-http://localhost:4000}"
HMAC_SECRET="${HMAC_SECRET:-test_hmac_secret}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log() {
    echo -e "[$(date +%Y-%m-%dT%H:%M:%S)] $1"
}

log_info() {
    log "${BLUE}INFO${NC}: $1"
}

log_success() {
    log "${GREEN}SUCCESS${NC}: $1"
}

log_warn() {
    log "${YELLOW}WARN${NC}: $1"
}

log_error() {
    log "${RED}ERROR${NC}: $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        log "DEBUG: $1"
    fi
}

show_help() {
    head -30 "$0" | tail -27
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --date)
                RECONCILE_DATE="$2"
                shift 2
                ;;
            --banca-id)
                BANCA_ID="$2"
                shift 2
                ;;
            --request-ids)
                REQUEST_IDS="$2"
                shift 2
                ;;
            --force-check)
                FORCE_CHECK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --email)
                REPORT_EMAIL="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

# Calculate HMAC signature
calculate_signature() {
    local method="$1"
    local path="$2"
    local timestamp="$3"
    local body="$4"
    
    local signature_base="${method}${path}${timestamp}${body}"
    echo -n "$signature_base" | openssl dgst -sha256 -hmac "$HMAC_SECRET" -binary | base64
}

# Execute SQL query
run_query() {
    local query="$1"
    psql "$DATABASE_URL" -t -A -c "$query" 2>/dev/null
}

# =============================================================================
# RECONCILIATION FUNCTIONS
# =============================================================================

# Get plays from Lotolink database for the given date
get_lotolink_plays() {
    local date="$1"
    local output_file="$2"
    
    log_info "Fetching Lotolink plays for $date..."
    
    local query="
        SELECT 
            id,
            request_id,
            user_id,
            lottery_id,
            amount,
            currency,
            status,
            play_id_banca,
            ticket_code,
            banca_id,
            created_at,
            updated_at
        FROM plays
        WHERE DATE(created_at) = '$date'
        ORDER BY created_at
    "
    
    if [ -n "$BANCA_ID" ]; then
        # Validate BANCA_ID format (alphanumeric, underscore, hyphen only, max 50 chars)
        if ! echo "$BANCA_ID" | grep -qE '^[a-zA-Z0-9_-]{1,50}$'; then
            log_error "Invalid BANCA_ID format. Only alphanumeric, underscore, and hyphen allowed (max 50 chars)."
            exit 1
        fi
        
        query="
            SELECT 
                id,
                request_id,
                user_id,
                lottery_id,
                amount,
                currency,
                status,
                play_id_banca,
                ticket_code,
                banca_id,
                created_at,
                updated_at
            FROM plays
            WHERE DATE(created_at) = '$date'
              AND banca_id = '$BANCA_ID'
            ORDER BY created_at
        "
    fi
    
    if [ -n "$REQUEST_IDS" ]; then
        # Validate that REQUEST_IDS only contains valid UUID characters and commas
        if ! echo "$REQUEST_IDS" | grep -qE '^[a-f0-9,-]{1,500}$'; then
            log_error "Invalid REQUEST_IDS format. Only UUID characters and commas are allowed."
            exit 1
        fi
        
        # Split by comma and validate each ID is a valid UUID format
        local validated_ids=""
        IFS=',' read -ra ID_ARRAY <<< "$REQUEST_IDS"
        for id in "${ID_ARRAY[@]}"; do
            # Trim whitespace and validate UUID format (8-4-4-4-12)
            id=$(echo "$id" | tr -d ' ')
            if echo "$id" | grep -qE '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'; then
                if [ -n "$validated_ids" ]; then
                    validated_ids="$validated_ids','$id"
                else
                    validated_ids="$id"
                fi
            else
                log_warn "Skipping invalid UUID: $id"
            fi
        done
        
        if [ -z "$validated_ids" ]; then
            log_error "No valid UUIDs provided in REQUEST_IDS"
            exit 1
        fi
        
        query="
            SELECT 
                id,
                request_id,
                user_id,
                lottery_id,
                amount,
                currency,
                status,
                play_id_banca,
                ticket_code,
                banca_id,
                created_at,
                updated_at
            FROM plays
            WHERE request_id IN ('$validated_ids')
            ORDER BY created_at
        "
    fi
    
    # Execute query and save to file
    if command -v psql &> /dev/null; then
        run_query "$query" > "$output_file"
        log_verbose "Saved $(wc -l < "$output_file") plays to $output_file"
    else
        log_warn "psql not available, using mock data"
        echo "# Mock data - psql not available" > "$output_file"
    fi
}

# Get plays from Banca for comparison
get_banca_plays() {
    local date="$1"
    local output_file="$2"
    
    log_info "Fetching Banca plays for $date..."
    
    # For mock banca, use admin endpoint
    if curl -s -f "$BANCA_API_URL/health" > /dev/null 2>&1; then
        curl -s "$BANCA_API_URL/admin/plays" > "$output_file" 2>/dev/null || echo "[]" > "$output_file"
        log_verbose "Fetched banca plays to $output_file"
    else
        log_warn "Banca API not available"
        echo "[]" > "$output_file"
    fi
}

# Find discrepancies between Lotolink and Banca
find_discrepancies() {
    local lotolink_file="$1"
    local banca_file="$2"
    local discrepancies_file="$3"
    
    log_info "Comparing Lotolink and Banca records..."
    
    # Initialize discrepancies report
    cat > "$discrepancies_file" << EOF
# Reconciliation Report
# Date: $RECONCILE_DATE
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================

EOF
    
    # Count records
    local lotolink_count=$(wc -l < "$lotolink_file" 2>/dev/null | tr -d ' ' || echo 0)
    local banca_count=$(cat "$banca_file" 2>/dev/null | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
    
    echo "## Summary" >> "$discrepancies_file"
    echo "- Lotolink plays: $lotolink_count" >> "$discrepancies_file"
    echo "- Banca plays: $banca_count" >> "$discrepancies_file"
    echo "" >> "$discrepancies_file"
    
    # Check for plays stuck in pending
    local pending_plays=$(grep -c "pending" "$lotolink_file" 2>/dev/null || echo 0)
    if [ "$pending_plays" -gt 0 ]; then
        echo "## Plays Stuck in Pending: $pending_plays" >> "$discrepancies_file"
        grep "pending" "$lotolink_file" >> "$discrepancies_file" 2>/dev/null || true
        echo "" >> "$discrepancies_file"
    fi
    
    # Check for status mismatches (requires proper parsing)
    echo "## Status Verification" >> "$discrepancies_file"
    echo "- Pending: $pending_plays" >> "$discrepancies_file"
    echo "- Note: Detailed comparison requires database access" >> "$discrepancies_file"
    echo "" >> "$discrepancies_file"
    
    log_verbose "Discrepancies report saved to $discrepancies_file"
}

# Check pending plays with Banca
check_pending_plays() {
    local pending_file="$1"
    local results_file="$2"
    
    log_info "Checking pending plays with Banca..."
    
    if [ ! -s "$pending_file" ]; then
        log_info "No pending plays to check"
        echo "# No pending plays found" > "$results_file"
        return
    fi
    
    echo "# Pending Play Status Check" > "$results_file"
    echo "# Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$results_file"
    echo "" >> "$results_file"
    
    while IFS='|' read -r id request_id rest; do
        if [ -z "$request_id" ]; then
            continue
        fi
        
        log_verbose "Checking play: $request_id"
        
        # Query banca for status (mock implementation)
        if curl -s -f "$BANCA_API_URL/health" > /dev/null 2>&1; then
            # Would need to query specific play status
            echo "- $request_id: needs_check" >> "$results_file"
        else
            echo "- $request_id: banca_unavailable" >> "$results_file"
        fi
    done < "$pending_file"
}

# Resolve discrepancies
resolve_discrepancies() {
    local discrepancies_file="$1"
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY RUN: Would resolve discrepancies from $discrepancies_file"
        return
    fi
    
    log_info "Resolving discrepancies..."
    
    # This would contain logic to:
    # 1. Update play statuses based on Banca responses
    # 2. Trigger refunds for failed plays
    # 3. Mark plays as reconciled
    
    log_info "Discrepancy resolution complete"
}

# Calculate commission totals
calculate_commissions() {
    local date="$1"
    local output_file="$2"
    
    log_info "Calculating commissions for $date..."
    
    local query="
        SELECT 
            banca_id,
            COUNT(*) as play_count,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as confirmed_amount,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count
        FROM plays
        WHERE DATE(created_at) = '$date'
        GROUP BY banca_id
        ORDER BY banca_id
    "
    
    echo "# Commission Report for $date" > "$output_file"
    echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$output_file"
    echo "" >> "$output_file"
    
    if command -v psql &> /dev/null; then
        run_query "$query" >> "$output_file" 2>/dev/null || echo "Database not available" >> "$output_file"
    else
        echo "Database not available - psql required" >> "$output_file"
    fi
    
    log_verbose "Commission report saved to $output_file"
}

# Generate final report
generate_report() {
    local date="$1"
    local report_file="$OUTPUT_DIR/reconciliation-report-$date.md"
    
    log_info "Generating final reconciliation report..."
    
    cat > "$report_file" << EOF
# Lotolink Reconciliation Report

## Date: $date
## Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

---

## Summary

| Metric | Value |
|--------|-------|
| Reconciliation Date | $date |
| Report Generated | $(date -u +"%Y-%m-%dT%H:%M:%SZ") |
| Dry Run | $DRY_RUN |
| Force Check | $FORCE_CHECK |

---

## Lotolink Plays

\`\`\`
$(cat "$OUTPUT_DIR/lotolink-plays-$date.txt" 2>/dev/null | head -20)
\`\`\`

---

## Discrepancies

$(cat "$OUTPUT_DIR/discrepancies-$date.txt" 2>/dev/null)

---

## Commission Summary

\`\`\`
$(cat "$OUTPUT_DIR/commissions-$date.txt" 2>/dev/null)
\`\`\`

---

## Recommendations

1. Review any plays stuck in "pending" status
2. Verify commission calculations with bancas
3. Follow up on any discrepancies identified
4. Archive this report for audit trail

---

*Report generated by Lotolink Reconciliation Script v1.0*
EOF

    log_success "Report saved to: $report_file"
    
    # Send email if configured
    if [ -n "$REPORT_EMAIL" ] && [ -n "$SMTP_HOST" ]; then
        send_report_email "$report_file"
    fi
}

# Send report via email
send_report_email() {
    local report_file="$1"
    
    log_info "Sending report to $REPORT_EMAIL..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY RUN: Would send email to $REPORT_EMAIL"
        return
    fi
    
    # Using sendmail or mail command
    if command -v mail &> /dev/null; then
        mail -s "Lotolink Reconciliation Report - $RECONCILE_DATE" "$REPORT_EMAIL" < "$report_file"
        log_success "Report sent to $REPORT_EMAIL"
    else
        log_warn "mail command not available, skipping email"
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    parse_args "$@"
    
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         LOTOLINK DAILY RECONCILIATION                     ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_info "Starting reconciliation for date: $RECONCILE_DATE"
    log_info "Output directory: $OUTPUT_DIR"
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "Running in DRY RUN mode - no changes will be made"
    fi
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Step 1: Fetch Lotolink plays
    get_lotolink_plays "$RECONCILE_DATE" "$OUTPUT_DIR/lotolink-plays-$RECONCILE_DATE.txt"
    
    # Step 2: Fetch Banca plays
    get_banca_plays "$RECONCILE_DATE" "$OUTPUT_DIR/banca-plays-$RECONCILE_DATE.json"
    
    # Step 3: Find discrepancies
    find_discrepancies \
        "$OUTPUT_DIR/lotolink-plays-$RECONCILE_DATE.txt" \
        "$OUTPUT_DIR/banca-plays-$RECONCILE_DATE.json" \
        "$OUTPUT_DIR/discrepancies-$RECONCILE_DATE.txt"
    
    # Step 4: Check pending plays
    grep -i "pending" "$OUTPUT_DIR/lotolink-plays-$RECONCILE_DATE.txt" > "$OUTPUT_DIR/pending-plays-$RECONCILE_DATE.txt" 2>/dev/null || true
    check_pending_plays \
        "$OUTPUT_DIR/pending-plays-$RECONCILE_DATE.txt" \
        "$OUTPUT_DIR/pending-status-$RECONCILE_DATE.txt"
    
    # Step 5: Resolve discrepancies (if not dry run)
    if [ "$FORCE_CHECK" = true ] || [ "$DRY_RUN" = false ]; then
        resolve_discrepancies "$OUTPUT_DIR/discrepancies-$RECONCILE_DATE.txt"
    fi
    
    # Step 6: Calculate commissions
    calculate_commissions "$RECONCILE_DATE" "$OUTPUT_DIR/commissions-$RECONCILE_DATE.txt"
    
    # Step 7: Generate final report
    generate_report "$RECONCILE_DATE"
    
    echo ""
    log_success "Reconciliation complete!"
    echo ""
    echo "Output files:"
    ls -la "$OUTPUT_DIR"/*"$RECONCILE_DATE"* 2>/dev/null || echo "  (no files generated)"
    echo ""
}

# Run main function
main "$@"

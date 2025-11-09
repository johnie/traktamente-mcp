#!/bin/bash

# Test script for Cloudflare Workers deployment
# Usage: ./test-worker.sh [URL]
# Default: http://localhost:8787

set -e

URL="${1:-http://localhost:8787}"
echo "Testing Traktamente MCP Server at: $URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed() {
  echo -e "${GREEN}✓${NC} $1"
}

test_failed() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

test_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Test 1: Health Check
test_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$URL/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  test_passed "Health check endpoint working"
else
  test_failed "Health check failed: $HEALTH_RESPONSE"
fi

# Test 2: Root Endpoint
test_info "Testing root endpoint..."
ROOT_RESPONSE=$(curl -s "$URL/")
if echo "$ROOT_RESPONSE" | grep -q "Traktamente MCP Server"; then
  test_passed "Root endpoint working"
else
  test_failed "Root endpoint failed: $ROOT_RESPONSE"
fi

# Test 3: MCP Initialize
test_info "Testing MCP initialize..."
INIT_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }')
if echo "$INIT_RESPONSE" | grep -q '"protocolVersion"'; then
  test_passed "MCP initialize working"
else
  test_failed "MCP initialize failed: $INIT_RESPONSE"
fi

# Test 4: List Tools
test_info "Testing tools/list..."
TOOLS_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }')
if echo "$TOOLS_RESPONSE" | grep -q "get_traktamente"; then
  test_passed "Tools list working (found get_traktamente)"
else
  test_failed "Tools list failed: $TOOLS_RESPONSE"
fi

# Test 5: Call get_traktamente
test_info "Testing tools/call with get_traktamente..."
CALL_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_traktamente",
      "arguments": {
        "landskod": "NO",
        "år": "2025",
        "limit": 5
      }
    }
  }')
# Check for resultCount and Norge in the response
if echo "$CALL_RESPONSE" | grep -q 'resultCount' && echo "$CALL_RESPONSE" | grep -q 'Norge'; then
  test_passed "get_traktamente tool working (found Norge)"
else
  test_failed "get_traktamente tool failed: $CALL_RESPONSE"
fi

# Test 6: Call get_all_countries
test_info "Testing tools/call with get_all_countries..."
COUNTRIES_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_all_countries",
      "arguments": {
        "limit": 10
      }
    }
  }')
if echo "$COUNTRIES_RESPONSE" | grep -q 'resultCount'; then
  test_passed "get_all_countries tool working"
else
  test_failed "get_all_countries tool failed: $COUNTRIES_RESPONSE"
fi

# Test 7: Call search_traktamente
test_info "Testing tools/call with search_traktamente..."
SEARCH_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "search_traktamente",
      "arguments": {
        "search": "Norge",
        "limit": 5
      }
    }
  }')
if echo "$SEARCH_RESPONSE" | grep -q 'resultCount'; then
  test_passed "search_traktamente tool working"
else
  test_failed "search_traktamente tool failed: $SEARCH_RESPONSE"
fi

# Test 8: CORS Headers
test_info "Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$URL/mcp")
if echo "$CORS_RESPONSE" | grep -qi "Access-Control-Allow-Origin"; then
  test_passed "CORS headers present"
else
  test_failed "CORS headers missing"
fi

# Test 9: Invalid JSON-RPC
test_info "Testing error handling..."
ERROR_RESPONSE=$(curl -s -X POST "$URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "unknown_method"
  }')
if echo "$ERROR_RESPONSE" | grep -q '"error"'; then
  test_passed "Error handling working"
else
  test_failed "Error handling failed: $ERROR_RESPONSE"
fi

echo ""
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Health check: OK"
echo "  - MCP protocol: OK"
echo "  - Tools: 3/3 working"
echo "  - CORS: OK"
echo "  - Error handling: OK"

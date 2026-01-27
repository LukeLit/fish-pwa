#!/bin/bash
# Fish Editor & Asset Management Test Suite
# Tests the core functionality of the updated system

set -e

echo "🧪 Fish Editor & Asset Management Test Suite"
echo "=============================================="
echo ""

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

test_api() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -X DELETE "$BASE_URL$url")
    else
        response=$(curl -s "$BASE_URL$url")
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        ((FAILED++))
        return 1
    fi
}

echo "📋 Pre-requisites Check"
echo "----------------------"

# Check if server is running
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server not running at $BASE_URL${NC}"
    echo "  Please start the development server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

echo "🔍 API Endpoint Tests"
echo "--------------------"

# Test creature APIs
test_api "List Creatures" "/api/list-creatures"

# Test save creature (minimal payload)
CREATURE_DATA='{
  "creatureId": "test-fish",
  "metadata": {
    "id": "test-fish",
    "name": "Test Fish",
    "description": "A test fish for validation",
    "type": "prey",
    "stats": {
      "size": 60,
      "speed": 5,
      "health": 20,
      "damage": 5
    },
    "sprite": "",
    "rarity": "common",
    "biomeId": "shallow",
    "essenceTypes": [{"type": "shallow", "baseYield": 10}],
    "spawnRules": {
      "canAppearIn": ["shallow"],
      "spawnWeight": 50
    }
  }
}'

echo ""
echo "Note: save-creature requires FormData and cannot be tested via curl JSON."
echo "      This should be tested manually in the fish editor."

test_api "Get Creature (should 404 or return data)" "/api/get-creature?id=test-fish" || true

# Test background APIs
test_api "List Fish Assets" "/api/list-assets?type=fish"
test_api "List Background Assets" "/api/list-assets?type=background"

# Test biome data
echo ""
echo "Note: Biome data tests require actual saved biomes."
echo "      These will be created when backgrounds are saved."

echo ""
echo "📊 Test Summary"
echo "--------------"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please check the errors above.${NC}"
    exit 1
fi

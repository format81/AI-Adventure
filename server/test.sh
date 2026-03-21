#!/bin/bash
# Test script for AI Avventura API
# Start server first: ADMIN_USERS="admin:testpass" DEMO_PASSWORD="demo2026" SESSION_SECRET="secret" node server/index.js

BASE="http://localhost:8080/api"

echo "=== 1. Admin Login ==="
ADMIN_RES=$(curl -s -X POST "$BASE/auth/admin-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"testpass"}')
echo "$ADMIN_RES"
TOKEN=$(echo "$ADMIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "=== 2. Demo Login ==="
curl -s -X POST "$BASE/auth/demo-login" \
  -H "Content-Type: application/json" \
  -d '{"password":"demo2026"}'
echo ""

echo ""
echo "=== 3. Create Session ==="
SESSION_RES=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Classe 4B - Test"}')
echo "$SESSION_RES"
SESSION_ID=$(echo "$SESSION_RES" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
SESSION_CODE=$(echo "$SESSION_RES" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
echo "Session ID: $SESSION_ID"
echo "Session Code: $SESSION_CODE"

echo ""
echo "=== 4. List Sessions ==="
curl -s "$BASE/sessions" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 5. Join Session as Team ==="
JOIN_RES=$(curl -s -X POST "$BASE/game/join" \
  -H "Content-Type: application/json" \
  -d "{\"sessionCode\":\"$SESSION_CODE\",\"teamName\":\"I Robottini\"}")
echo "$JOIN_RES"
TEAM_ID=$(echo "$JOIN_RES" | grep -o '"teamId":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "=== 6. Start Session ==="
curl -s -X POST "$BASE/sessions/$SESSION_ID/start" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 7. Advance to Game 1 ==="
curl -s -X POST "$BASE/sessions/$SESSION_ID/advance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"stage":"game1","questionIndex":0}'
echo ""

echo ""
echo "=== 8. Submit Response ==="
curl -s -X POST "$BASE/game/respond" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"teamId\":\"$TEAM_ID\",\"game\":\"game1\",\"questionIndex\":0,\"answer\":\"umano\"}"
echo ""

echo ""
echo "=== 9. Get Scores ==="
curl -s "$BASE/game/$SESSION_ID/scores"
echo ""

echo ""
echo "=== 10. Get Game Content ==="
curl -s "$BASE/game/content" | head -c 200
echo "..."

echo ""
echo "=== 11. Get Results ==="
curl -s "$BASE/results/$SESSION_ID" -H "Authorization: Bearer $TOKEN" | head -c 300
echo "..."

echo ""
echo "=== 12. Get Session State ==="
curl -s "$BASE/game/$SESSION_ID/state"
echo ""

echo ""
echo "=== Done! ==="

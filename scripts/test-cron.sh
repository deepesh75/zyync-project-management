#!/bin/bash

# Test script for subscription expiration cron job
# Usage: ./scripts/test-cron.sh [environment]
# environment: local (default) or production

ENV=${1:-local}

if [ "$ENV" = "production" ]; then
  URL="https://www.zyync.com/api/cron/check-subscriptions"
  echo "🌐 Testing PRODUCTION cron endpoint..."
else
  URL="http://localhost:3000/api/cron/check-subscriptions"
  echo "🏠 Testing LOCAL cron endpoint..."
fi

# Read CRON_SECRET from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET not found in .env file"
  exit 1
fi

echo "🔑 Using CRON_SECRET: ${CRON_SECRET:0:10}..."
echo "📡 Sending request to: $URL"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

# Split response and status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_STATUS"
echo "📄 Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Cron job executed successfully!"
  
  # Parse and display results
  EMAIL_COUNT=$(echo "$BODY" | jq -r '.emailsSent // 0' 2>/dev/null)
  if [ "$EMAIL_COUNT" -gt 0 ]; then
    echo "📧 Sent $EMAIL_COUNT expiration warning email(s)"
  else
    echo "ℹ️  No expiring subscriptions found (this is normal if all subscriptions are healthy)"
  fi
else
  echo "❌ Cron job failed!"
fi

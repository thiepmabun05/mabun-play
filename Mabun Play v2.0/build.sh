#!/bin/bash
# build.sh – replaces placeholders with environment variables

# Copy config.js to a temporary location or process in place
sed -i "s|__API_BASE_URL__|${API_BASE_URL}|g" js/core/config.js
sed -i "s|__SUPABASE_URL__|${SUPABASE_URL}|g" js/core/config.js
sed -i "s|__SUPABASE_ANON_KEY__|${SUPABASE_ANON_KEY}|g" js/core/config.js

echo "Config updated."

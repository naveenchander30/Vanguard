# [C1] Backend cannot reach Kismet in Docker production deployment

**Severity:** Critical  
**File:** `docker-compose.yml`  

Kismet uses `network_mode: host`, backend uses default bridge. No `KISMET_URL` env passed. Backend can't reach `localhost:2501`.

**Fix:** Set `network_mode: host` on backend or add `KISMET_URL` env var.

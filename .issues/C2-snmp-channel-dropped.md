# [C2] SNMP telemetry silently dropped from scoring

**Severity:** Critical  
**Files:** `snmp-poller.ts:63`, `scoring-engine.ts:37`  

SNMP poller sets `channel: ''`. Scoring engine does `parseInt('',10)` → `NaN` → `continue`. All SNMP data silently discarded.

**Fix:** Make scoring engine handle missing channels, or have SNMP poller derive channel.

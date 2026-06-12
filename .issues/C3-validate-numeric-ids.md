# [C3] Non-numeric route params crash Prisma

**Severity:** Critical  
**File:** `routes/infrastructure.ts:51,54,64,72,86,89`  

`parseInt("abc")` → `NaN` → Prisma crashes with unhandled error.

**Fix:** Validate that `id` is a valid integer before passing to Prisma.

# 📮 HireSys Security & RBAC Postman Collection

This directory contains automated API tests for verifying **Authentication**, **Role-Based Access Control (RBAC)**, and **Multi-Tenant Data Isolation (BOLA/IDOR)** in HireSys.

---

## 🎯 Test Scenarios Covered

1. **No Token $\rightarrow$ 401 Unauthorized:**  
   Calls `GET /api/interviews` without an Authorization header. Verifies rejection and that no tenant metadata is leaked.
2. **Tenant B Token $\rightarrow$ Tenant A Resource $\rightarrow$ 403 Forbidden / 404 Not Found:**  
   A user belonging to Organization B attempts to view an interview record owned by Organization A. Asserts zero cross-tenant candidate PII leak.
3. **Tampered / Expired JWT $\rightarrow$ 401 Unauthorized:**  
   Submits forged or expired JWT signatures. Verifies backend verification failure.
4. **Candidate Token $\rightarrow$ Recruiter Feedback $\rightarrow$ 403 Forbidden:**  
   Candidate joining via guest token is blocked from viewing internal interview scorecards or hiring rubrics.

---

## 🚀 How to Run

### Option 1: In Postman App
1. Open Postman.
2. Click **Import** $\rightarrow$ Select `HireSys_Security_RBAC_Collection.postman_collection.json`.
3. Import `HireSys_Local.postman_environment.json` as your active Environment.
4. Click **Run Collection**.

### Option 2: Run via CLI (Newman)
```bash
# Run collection using Newman in headless CI or terminal
npx newman run tests/postman/HireSys_Security_RBAC_Collection.postman_collection.json \
  -e tests/postman/HireSys_Local.postman_environment.json \
  --reporters cli,json
```


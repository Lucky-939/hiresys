# 🧪 HireSys — Selenium WebDriver E2E Automation Suite

A modern, standalone End-to-End (E2E) UI automation framework built with **Selenium WebDriver**, **TypeScript**, and **Mocha/Chai** following the **Page Object Model (POM)** design pattern.

---

## 🎯 Key Capabilities
* **Zero Production Footprint**: Fully decoupled in `tests/selenium-e2e`. Never touches `apps/web` or `apps/server` dependencies.
* **Page Object Model (POM)**: Every UI view (`LoginPage`, `DashboardPage`, `InterviewRoomPage`) is abstracted into reusable, maintainable classes with dedicated locators.
* **Data-Driven Testing (DDT)**: Externalized 7-case negative login test suite (`negative_login_cases.json`) covering empty inputs, wrong passwords, SQL injection strings, boundary buffers, and unicode/XSS characters.
* **Concurrency & Race Condition Validation**: Multi-driver execution harness executing simultaneous actions across separate browser contexts to assert atomic single-use behavior with zero duplicates.
* **Console Error Assertion**: Intercepts `driver.manage().logs()` to assert zero fatal JavaScript/runtime crashes on `/login` and `/dashboard`.
* **CI/CD Integration**: Pre-configured GitHub Actions workflow (`.github/workflows/selenium-ci.yml`) running headless execution with automated screenshot/report artifact uploads.
* **API Security & RBAC Suite**: Standalone Postman collection (`tests/postman`) validating 401s, multi-tenant BOLA/IDOR protection (403/404), and tampered JWT verification.

---

## 📁 Directory Structure

```text
interview-platform/
├── .github/workflows/
│   └── selenium-ci.yml        # Automated CI workflow running headless tests & uploading artifacts
├── tests/
│   ├── postman/               # Postman API Security & RBAC Test Suite
│   │   ├── HireSys_Security_RBAC_Collection.postman_collection.json
│   │   ├── HireSys_Local.postman_environment.json
│   │   └── README.md
│   └── selenium-e2e/
│       ├── package.json       # Independent test runner dependencies
│       ├── tsconfig.json      # TypeScript compilation settings
│       ├── .env / .env.example# Test URLs, browser, and headless options
│       ├── README.md
│       └── src/
│           ├── config/
│           │   └── testConfig.ts      # Target URLs, timeouts, and credentials
│           ├── fixtures/
│           │   └── negative_login_cases.json # 7 Data-driven negative cases
│           ├── utils/
│           │   ├── driverFactory.ts   # Chrome/Firefox factory with browser logging
│           │   ├── waitHelpers.ts     # Fluent explicit wait utilities
│           │   └── consoleValidator.ts# SEVERE console error assertions
│           ├── pages/                 # Page Object Model layer
│           │   ├── BasePage.ts
│           │   ├── LoginPage.ts
│           │   ├── DashboardPage.ts
│           │   └── InterviewRoomPage.ts
│           └── specs/                 # Test suites
│               ├── 01_auth.spec.ts    # Authentication UI tests
│               ├── 02_rbac.spec.ts    # Security test: unauthenticated redirects
│               ├── 03_room.spec.ts    # Collaborative coding room loading
│               ├── 04_negative_login_datadriven.spec.ts # Data-driven 7-case suite
│               ├── 05_race_condition.spec.ts            # Concurrency & race condition
│               └── 06_console_errors.spec.ts            # JS console error assertions
```

---

## 🚀 How to Run

### Run Local Automated Suites
From `tests/selenium-e2e`:

| Command | Description |
| :--- | :--- |
| `npm test` | Runs the full E2E test suite |
| `npm run test:negative` | Runs 7-case data-driven negative login tests |
| `npm run test:race` | Runs multi-context concurrency & race-condition test |
| `npm run test:console` | Asserts zero SEVERE JavaScript errors on core pages |
| `npm run test:rbac` | Runs role-based security & route protection tests |
| `npm run test:headless` | Runs all tests headlessly in background |

---

## 📋 Comprehensive Automated Test Catalog

| Test Case ID | Test Category | Description | Type |
| :--- | :--- | :--- | :--- |
| `TC_AUTH_01` | Authentication | Verify login page renders input fields, links, and submit button. | Positive / UI |
| `TC_AUTH_02` | Authentication | Verify invalid credentials trigger error message without redirecting. | Negative |
| `TC_NEG_01` | Data-Driven Auth | Empty email with valid password (assert HTML5 validation block). | Negative |
| `TC_NEG_02` | Data-Driven Auth | Valid email format with empty password. | Negative |
| `TC_NEG_03` | Data-Driven Auth | Both email and password empty. | Negative |
| `TC_NEG_04` | Data-Driven Auth | Valid email with wrong password (assert 401 error banner). | Negative |
| `TC_NEG_05` | Data-Driven Auth | SQL Injection string (`' OR '1'='1' --`) rejected by Prisma ORM. | Security |
| `TC_NEG_06` | Data-Driven Auth | 200-character boundary buffer input strictly rejected with HTTP 400/422 status and field error banner. | Boundary |
| `TC_NEG_07` | Data-Driven Auth | Unicode emojis & `<script>` tags sanitized without XSS execution. | Security |
| `TC_RACE_01` | Concurrency | Two concurrent browser contexts trigger fresh single-use invite -> exactly 1 succeeds (200), loser receives 409 Conflict, 0 duplicate records. (Includes setup/teardown for repeatability). | Concurrency |
| `TC_CONSOLE_01` | Console Health | Asserts zero SEVERE JavaScript console errors on `/login` load. | Code Quality |
| `TC_CONSOLE_02` | Console Health | Asserts zero unhandled JavaScript runtime crashes on `/dashboard`. | Code Quality |
| `TC_RBAC_01` | RBAC & Security | Verify unauthenticated user accessing `/dashboard` is redirected to `/login`. | Security |
| `TC_RBAC_02` | RBAC & Security | Verify unauthenticated user accessing `/dashboard/members` is redirected to `/login`. | Security |
| `TC_ROOM_01` | Collaborative Room | Verify `/room/[id]` initializes URL routing and container layout. | Sanity |

---

## 📮 Postman API Security Collection

Located at `tests/postman/HireSys_Security_RBAC_Collection.postman_collection.json`:
1. **Missing Token $\rightarrow$ 401 Unauthorized**: No Authorization header on protected endpoints.
2. **Tenant B Token $\rightarrow$ Tenant A Resource $\rightarrow$ 403 Forbidden / 404**: Asserts Tenant B cannot read Tenant A candidate records (BOLA/IDOR protection).
3. **Tampered / Expired JWT $\rightarrow$ 401 Unauthorized**: Malformed or expired signatures rejected.
4. **Candidate Token $\rightarrow$ Recruiter Rubric $\rightarrow$ 403 Forbidden**: Candidate scoped token blocked from private interview rubrics.

# Hirin Playwright — comprehensive project documentation

A detailed guide to the Hirin end-to-end test suite structure, features, and how everything connects.

**For quick setup:** see [`docs/PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md).

---

## Table of contents

1. [Executive summary](#executive-summary)
2. [Project structure](#project-structure)
3. [Features and test coverage](#features-and-test-coverage)
4. [Environment configuration](#environment-configuration)
5. [CI/CD pipeline overview](#cicd-pipeline-overview)
6. [Dependencies and tooling](#dependencies-and-tooling)
7. [Key patterns and conventions](#key-patterns-and-conventions)
8. [Getting started (quick reference)](#getting-started-quick-reference)
9. [Common tasks](#common-tasks)
10. [Maintenance and next steps](#maintenance-and-next-steps)

---

## Executive summary

**Hirin Playwright** is a comprehensive **end-to-end (E2E) test suite** for the Hirin recruitment platform. It covers ~20 test specs across 10+ feature areas, from authentication to offer management and candidate lifecycle.

- **Framework:** [Playwright Test](https://playwright.dev/) (^1.57.0)
- **Reporting:** [Allure](https://docs.qameta.io/allure/) + HTML
- **Architecture:** Page Object Model (POM) for maintainability
- **CI/CD:** GitHub Actions with scheduled and on-demand workflows
- **Coverage:** ~20 specs with `@smoke` (fast) and `@regression` (comprehensive) tags

Quick links:
- **Setup & CI/CD details:** [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)
- **Test directory:** `tests/` (20+ `.spec.js` files)
- **Page objects:** `pages/` (LoginPage, DashboardPage, etc.)

---

## Project structure

### Root level

```
Hirin-Playwright/
├── package.json              # Dependencies: Playwright, Allure, dotenv, etc.
├── package-lock.json         # Locked dependency versions
├── playwright.config.js       # Playwright test configuration
├── global-setup.js            # Pre-test setup: auth bootstrap → storageState.json
├── .env                       # Local environment variables (gitignored)
├── .env.example               # Template for .env
├── storageState.json          # Generated session state (gitignored)
├── .gitignore                 # Excludes reports, artifacts, secrets
├── README.md                  # Quick reference
├── docs/                      # Project documentation
├── tests/                     # Test specifications (20+ specs)
├── pages/                     # Page objects (LoginPage, DashboardPage, etc.)
├── data/                      # Test data, credentials, PDF files
├── .github/workflows/         # CI/CD GitHub Actions workflows
├── allure-results/            # Allure report data (gitignored)
├── playwright-report/         # HTML test report (gitignored)
├── test-results/              # Playwright internal results (gitignored)
└── node_modules/              # Dependencies (gitignored)
```

### Detailed folder breakdown

#### `.github/workflows/` — CI/CD automation

Three GitHub Actions workflows control test execution:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **`playwright.yml`** | Push/PR to `main` or `master` | Runs `@smoke` tests on Chromium; uploads HTML report artifact. Purpose: fast feedback on PRs. |
| **`smoke-scheduled.yml`** | **Cron Mon–Thu 05:00 UTC** + manual `workflow_dispatch` | Runs full `@smoke` suite; generates Allure single-file HTML report; sends report via Gmail SMTP. Purpose: daily smoke validation. |
| **`regression-scheduled.yml`** | **Cron Friday 05:00 UTC** + manual `workflow_dispatch` | Runs full `@regression` suite; generates Allure report; sends report via email. Purpose: comprehensive weekly validation. |

**See [`PROJECT_OVERVIEW.md` Section 6](PROJECT_OVERVIEW.md#6-cicd-setup-github-actions) for detailed workflow breakdown and secrets configuration.**

#### `tests/` — Test specifications (20+ files)

All tests organized by feature. Files use `.spec.js` extension and include tags (`@smoke`, `@regression`).

| Feature area | Spec files | Purpose | Tags |
|--------------|-----------|---------|------|
| **Authentication** | `login.spec.js`<br>`logout.spec.js`<br>`forgot-password.spec.js` | Login/logout flow, password recovery, session | @smoke, @regression |
| **Job Management** | `create-jobs.spec.js`<br>`close-a-job.spec.js` | Create, list, close job postings | @smoke, @regression |
| **Candidate Lifecycle** | `add-candidate-from-candidates-page.spec.js`<br>`add-candidate-from-jobs-page.spec.js`<br>`add-candidate-from-queue-to-job.spec.js`<br>`move-candidate-from-one-job-to-another.spec.js` | Add candidates from multiple entry points; move between jobs/stages | @regression |
| **Candidate Export** | `export_candidate_email_format.spec.js`<br>`candidates-report.spec.js` | Email table format; ZIP resumes; candidate reporting | @regression |
| **Offer Management** | `offer-management.spec.js` | Create, send, track offers; document workflows | @regression |
| **End-to-end workflow** | `master-workflow-comprehensive.spec.js` | Complete hiring flow: job → candidate → screening → offer → documents | @regression |
| **Screening** | `screening_criteria.spec.js`<br>`screening-questionnaire.spec.js` | Define criteria; collect questionnaire responses | @regression |
| **Document submission** | `document-submission.spec.js` | Upload, verify, share candidate documents | @regression |
| **Public careers** | `careers.spec.js` | Public job listings, candidate portal, URLs | @regression |
| **Reporting** | `report.spec.js` | Recruitment analytics, dashboards | @regression |
| **Admin & Users** | `user-management.spec.js` | Roles, permissions, team settings | @regression |

**Test structure example:**

```javascript
test('TC-XX: Feature description @smoke @regression', async ({ page }) => {
  // 1. Setup: navigate & login (handled by storageState + global-setup)
  await page.goto('https://stgapp.hirin.ai');
  
  // 2. Perform actions using page objects
  const dashboard = new DashboardPage(page);
  await dashboard.navigateToCandidates();
  
  // 3. Verify outcomes
  await expect(page.locator('selector')).toBeVisible();
});
```

#### `pages/` — Page Object Model

Encapsulates UI selectors and interactions per page/feature. One class per page type.

| File | Class | Key methods |
|------|-------|-------------|
| `LoginPage.js` | `LoginPage` | `navigateToLoginPage()`, `fillEmail()`, `fillPassword()`, `clickLoginButton()`, `verifyLoginSuccess()`, `verifyErrorMessage()` |
| `DashboardPage.js` | `DashboardPage` | `navigateToDashboard()`, `navigateToCandidates()`, `navigateToJobs()`, `getClientSelector()` |
| `ModalPage.js` | `ModalPage` | Common modal interactions: `closeModal()`, `confirmAction()`, `cancelAction()` |
| `ForgotPasswordPage.js` | `ForgotPasswordPage` | `navigateToForgotPassword()`, `fillEmailAndSubmit()`, `verifyResetLink()` |

**Benefit of POM:**
- Locators defined once, reused across specs
- Easy selector updates (change in one place)
- Improved readability and maintainability

**Example usage in a spec:**

```javascript
import { LoginPage } from '../pages/LoginPage';

test('Login with valid credentials @smoke', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLoginPage('https://stgapp.hirin.ai/login');
  await loginPage.fillEmail('user@example.com');
  await loginPage.fillPassword('Test@1234');
  await loginPage.clickLoginButton();
  await loginPage.verifyLoginSuccess();
});
```

#### `data/` — Test data and fixtures

| Item | Type | Purpose |
|------|------|---------|
| `testData.js` | JS module | Centralized **credentials**, **URLs**, **timeouts**, **modal text**, **test constants** |
| `*.pdf` | Binary files | Resume/CV files for candidate upload tests (e.g., `Arjun_Ravani.pdf`, `20MB-TESTFILE.ORG.pdf`) |

**`testData.js` structure:**

```javascript
const testData = {
  credentials: {
    email: 'superadmin@yopmail.com',
    password: 'Test@1234',
    invalidEmail: 'invalid@example',
  },
  urls: {
    loginPage: 'https://stgapp.hirin.ai',  // Used by some specs
    dashboard: 'https://growexx-dev.hirin.ai/',  // Note: inconsistent env
  },
  timeouts: {
    pageLoadWait: 3000,
    finalWait: 2000,
  },
  modal: {
    congratulationsText: 'Congratulations !!!!',
    recruitmentSolutionText: 'Your one stop solution for AI powered Recruitment !!!',
  },
};

module.exports = testData;
```

**Note:** Not all specs consume this; many still use hardcoded URLs. See [Environment configuration](#environment-configuration).

#### `docs/` — Documentation

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | **Detailed technical setup, CI/CD secrets, environment switching, troubleshooting** — start here for setup. |
| `PROJECT_OVERVIEW.md` | **This file** — project structure, feature inventory, patterns. |

---

## Features and test coverage

### 1. Authentication & authorization

**Tests:** `login.spec.js`, `logout.spec.js`, `forgot-password.spec.js`, `user-management.spec.js`

**What's tested:**
- Email + password login with valid/invalid credentials
- Password reset flow via email
- Session persistence (saved to `storageState.json`)
- Logout and session termination
- Role-based UI visibility (e.g., admin-only buttons)

**Key file:** [`global-setup.js`](../global-setup.js) — runs before all tests; logs in once and saves session to `storageState.json` so each spec reuses the session.

### 2. Job management

**Tests:** `create-jobs.spec.js`, `close-a-job.spec.js`, `careers.spec.js`

**What's tested:**
- Create job postings with title, description, requirements
- Close/archive completed jobs
- List and filter jobs (admin view)
- Public careers portal job display
- Job-level candidate assignment

### 3. Candidate management

**Tests:** `add-candidate-from-candidates-page.spec.js`, `add-candidate-from-jobs-page.spec.js`, `add-candidate-from-queue-to-job.spec.js`, `move-candidate-from-one-job-to-another.spec.js`

**What's tested:**
- Add candidates from **main Candidates page** (bulk/single)
- Add candidates from **Job detail page** (inline)
- Add candidates from **job queue/board** (drag/drop or modal)
- Move candidates **between jobs** and **pipeline stages**
- Candidate status transitions (pipeline: Applied → Screening → Offer → Hired)

### 4. Candidate export & reporting

**Tests:** `export_candidate_email_format.spec.js`, `candidates-report.spec.js`, `report.spec.js`

**What's tested:**
- **Email table format export** — copy candidate table to clipboard in email-friendly layout
- **ZIP download** — bulk resume downloads
- **Candidate reports** — filtering, sorting, metrics
- **Recruitment reports** — dashboards, KPIs, analytics
- Column customization in exports (select/deselect fields)

### 5. Offer management

**Tests:** `offer-management.spec.js`

**What's tested:**
- Create and send job offers
- Offer templates and customization
- Offer status tracking (sent → accepted → rejected)
- Candidate offer portal access
- Document attachment (offer letter, contracts)
- Email notifications to candidates

### 6. End-to-end recruitment workflow

**Tests:** `master-workflow-comprehensive.spec.js`

**What's tested in one spec:**
1. Create a new job
2. Add a candidate to the job
3. Conduct screening (questionnaire/interview)
4. Submit/create an offer
5. Candidate uploads documents
6. Offer acceptance
7. Final hiring confirmation

**Purpose:** Validates the entire hiring pipeline works end-to-end without breaking data flow.

### 7. Screening & assessments

**Tests:** `screening_criteria.spec.js`, `screening-questionnaire.spec.js`

**What's tested:**
- Define screening criteria for jobs
- Create/send questionnaires to candidates
- Capture candidate responses
- Score/evaluate responses
- Screening status in candidate pipeline

### 8. Document management

**Tests:** `document-submission.spec.js`

**What's tested:**
- Candidate document uploads (PDF, resume, cover letter)
- File validation (type, size)
- Document storage and retrieval
- Sharing documents with interviewers/hiring team
- Document e-signature workflows (if applicable)

### 9. Public careers portal

**Tests:** `careers.spec.js`

**What's tested:**
- Public job listings display
- Job search and filtering
- Candidate application portal
- Public URLs (`growexx-stg.hirin.ai/careers`, etc.)
- Clipboard sharing of public links
- Preview mode for job listings

### 10. Admin & user management

**Tests:** `user-management.spec.js`

**What's tested:**
- User roles (Admin, Recruiter, Hiring Manager, etc.)
- Permission enforcement (UI buttons, page access)
- Team member invitation
- Account settings and profile
- Audit logging (if applicable)

---

## Environment configuration

### Current state

- **Default:** Most specs hardcode `https://stgapp.hirin.ai/login` (staging)
- **Dev:** Defined in some files as `https://devapp.hirin.ai` but rarely used
- **Production:** Not actively tested today
- **CI/CD:** Workflows run against staging (hardcoded in specs)

### Where URLs are defined

| Location | Current usage | Notes |
|----------|---------------|----|
| **Individual specs** | Primary | Each spec has `page.goto('https://stgapp.hirin.ai/...')` |
| **`data/testData.js`** | Partial | `urls.loginPage` exists but not all specs import it |
| **`global-setup.js`** | Bootstrap | Sets `BASE_URL = 'https://stgapp.hirin.ai/login'` |
| **`.env`** | Unused | Loaded by config, but no tests consume it |

### To switch environments

**Today:** Edit hardcoded URLs in all spec files + `global-setup.js`

**Recommended approach** (see [`PROJECT_OVERVIEW.md` Section 7.3](PROJECT_OVERVIEW.md#73-recommended-target-architecture-optional-refactor)):

1. Set `BASE_URL` in `.env` locally (e.g., `BASE_URL=https://devapp.hirin.ai`)
2. Enable `use.baseURL` in `playwright.config.js`
3. Refactor specs to use relative paths: `page.goto('/login')` instead of full URLs
4. For CI/CD: use GitHub **Variables** to set `BASE_URL` per environment

**Example `.env`:**

```env
BASE_URL=https://stgapp.hirin.ai
CAREERS_BASE_URL=https://growexx-stg.hirin.ai
```

**Example `playwright.config.js` (updated):**

```javascript
use: {
  baseURL: process.env.BASE_URL || 'https://stgapp.hirin.ai',
},
```

---

## CI/CD pipeline overview

### Workflow execution matrix

```
Push/PR to main/master
        ↓
    playwright.yml (smoke on Chromium)
        ↓
    ~15 min ✓ HTML report artifact
        
        
Mon-Thu 05:00 UTC / manual trigger
        ↓
    smoke-scheduled.yml
        ↓
    ~60 min ✓ Allure report + email
        
        
Friday 05:00 UTC / manual trigger
        ↓
    regression-scheduled.yml
        ↓
    ~360 min ✓ Allure report + email
```

### Typical job steps (all three workflows)

1. **Checkout** code
2. **Setup Node.js** (LTS)
3. **Cache npm dependencies**
4. **Run `npm ci`** (clean install)
5. **Install Playwright browsers** (`npx playwright install --with-deps chromium`)
6. **Run tests** with `--grep` tag + `--project=chromium`
7. **Setup Java** (for Allure generation)
8. **Generate Allure HTML** report
9. **Upload artifact** (HTML or Allure report)
10. **Send email** with report (scheduled workflows only)

### Secrets & email configuration

**Required GitHub Secrets** (for `smoke-scheduled.yml` and `regression-scheduled.yml`):

- `GMAIL_USERNAME` — Gmail sender address
- `GMAIL_APP_PASSWORD` — 16-character Google App Password (not regular password)
- `OUTLOOK_EMAIL` — recipient email address

**Setup:**
1. Go to **Settings → Secrets and variables → Actions → New repository secret**
2. Add the three secrets above
3. Workflows reference them as `${{ secrets.GMAIL_USERNAME }}` (never hardcode)

**See [`PROJECT_OVERVIEW.md` Section 6.3](PROJECT_OVERVIEW.md#63-secrets-smtp-and-email-reports) for detailed SMTP setup.**

---

## Dependencies and tooling

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.57.0 | Test framework, browser automation, assertions |
| `allure-playwright` | ^3.2.0 | Allure reporter integration; generates `allure-results/` |
| `allure-commandline` | ^2.32.0 | CLI tool to generate Allure HTML from results |
| `@types/node` | ^25.0.8 | TypeScript type definitions for Node.js |
| `pdf-parse` | ^1.1.1 | Parse PDF files in document upload tests |
| `xlsx` | ^0.18.5 | Handle Excel exports (if applicable) |
| `dotenv` | transitive | Load `.env` file (auto-installed via `playwright.config.js`) |

**Install all:**

```bash
npm ci
npx playwright install --with-deps chromium
```

---

## Key patterns and conventions

### Test naming

```
test('TC-<number>: <description> @smoke @regression', async ({ page }) => {
  // Test body
});
```

- **TC-number:** Unique test case identifier
- **Description:** What the test verifies
- **Tags:** `@smoke` (fast, critical) or `@regression` (comprehensive)

### Tag meanings

| Tag | Usage | When run |
|-----|-------|----------|
| `@smoke` | Fast, happy-path tests | PR/push + scheduled smoke |
| `@regression` | Comprehensive, edge-case tests | Scheduled regression only |
| Both tags | Test runs in all workflows | N/A |
| No tag | Not auto-run (manual only) | Use sparingly |

### Page Object Model structure

```javascript
import { expect } from '@playwright/test';

class MyPage {
  constructor(page) {
    this.page = page;
    // Define all locators here
    this.emailInput = page.getByTestId('EMAIL_INPUT');
    this.submitBtn = page.getByRole('button', { name: 'Submit' });
  }

  // Navigation
  async navigateToPage(url) {
    await this.page.goto(url);
  }

  // Actions
  async fillForm(email) {
    await this.emailInput.fill(email);
    await this.submitBtn.click();
  }

  // Assertions
  async verifySuccess() {
    await expect(this.page.locator('.success-message')).toBeVisible();
  }
}

export { MyPage };
```

### Test file structure

```javascript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('TC-001: Login with valid credentials @smoke', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  
  // Act
  await loginPage.navigateToLoginPage('https://stgapp.hirin.ai/login');
  await loginPage.fillEmail('user@example.com');
  await loginPage.fillPassword('Test@1234');
  await loginPage.clickLoginButton();
  
  // Assert
  await loginPage.verifyLoginSuccess();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

---

## Getting started (quick reference)

### Prerequisites

- Node.js (LTS)
- npm
- Playwright browsers

### 1. Clone and install

```bash
git clone <repo-url>
cd Hirin-Playwright
npm ci
npx playwright install --with-deps
```

### 2. Run tests locally

```bash
# All smoke tests
npx playwright test --grep '@smoke' --project=chromium

# All regression tests
npx playwright test --grep '@regression' --project=chromium

# Specific test file
npx playwright test tests/login.spec.js --project=chromium

# Headed mode (see browser)
npx playwright test --headed --project=chromium
```

### 3. View reports

```bash
# Allure (requires Java 17)
npx allure generate allure-results --single-file --clean -o allure-report
allure open allure-report

# Or HTML report
open playwright-report/index.html
```

### 4. Change environment (for local testing)

1. Edit `data/testData.js` and set `urls.loginPage` to desired environment
2. Update `global-setup.js` `BASE_URL`
3. Search specs for hardcoded URLs and update as needed
4. Run tests

**Or:** follow the recommended approach in [`PROJECT_OVERVIEW.md` Section 7.3](PROJECT_OVERVIEW.md#73-recommended-target-architecture-optional-refactor).

---

## Common tasks

### Add a new test

1. Create `tests/feature-name.spec.js`
2. Import necessary page objects
3. Add test with `@smoke` or `@regression` tag
4. Run locally to verify

```javascript
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test('TC-NEW: Feature works @smoke', async ({ page }) => {
  await page.goto('https://stgapp.hirin.ai');
  const dashboard = new DashboardPage(page);
  await dashboard.navigateToCandidates();
  await expect(page.locator('selector')).toBeVisible();
});
```

### Add a new page object

1. Create `pages/FeaturePage.js`
2. Define class with `constructor(page)` and methods
3. Export class
4. Import and use in specs

```javascript
export class FeaturePage {
  constructor(page) {
    this.page = page;
    this.button = page.getByRole('button', { name: 'Action' });
  }

  async performAction() {
    await this.button.click();
  }
}
```

### Update a selector

Find the selector in the relevant **page object** (`pages/*.js`), not in individual specs. Update once; all specs using that page object automatically get the fix.

### Debug a failing test

```bash
# Run in headed mode
npx playwright test tests/failing.spec.js --headed

# Or debug mode (interactive)
npx playwright test tests/failing.spec.js --debug
```

### Run on different browser

```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Maintenance and next steps

### Known issues

1. **`global-setup.js` URL duplication:** Sets `BASE_URL = '...../login'` then appends `/login` again → `/login/login`. Fix: use host-only base URL. (See [`PROJECT_OVERVIEW.md` Section 3.4](PROJECT_OVERVIEW.md#34-known-issue-in-global-setupjs-url-construction))

2. **Hardcoded URLs:** Tests hardcode staging URLs; switching environments requires code edits. **Recommended:** Implement centralized `BASE_URL` + GitHub Variables.

3. **Partial testData usage:** `data/testData.js` exists but not all specs consume it. Refactor to use consistently.

### Future improvements

- [ ] Implement `BASE_URL` environment variable pattern
- [ ] Add performance/load tests
- [ ] Expand public careers portal coverage
- [ ] Add accessibility (a11y) tests
- [ ] Integrate with Slack for CI notifications
- [ ] Add video recording for all failed tests
- [ ] Document and test production environment
- [ ] Parallel test execution (currently serial)

### Documentation

- **Setup & troubleshooting:** [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)
- **Playwright documentation:** https://playwright.dev
- **Allure documentation:** https://docs.qameta.io/allure

### Support & contact

For issues or questions:
1. Check [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) troubleshooting section
2. Review failing test output and Allure report
3. Check Playwright docs: https://playwright.dev/docs/debug

---

**Last updated:** April 2026  
**Playwright version:** ^1.57.0  
**For setup, CI/CD details, and environment switching:** see [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)

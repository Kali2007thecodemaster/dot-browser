Task: Aggregate EVERY internship posting from this search and write one Markdown brief sized for Claude.

URL: https://www.interninsider.me/dashboard?radiusKm=25&terms=Fall+2026&locations=Canada&majors=Mathematics

Mode: AGGREGATION / EXHAUSTIVE. The visible viewport is a window, not the page. Do NOT stop after the first few cards. Stop only when one of these is true:
  (a) next_page reports "already at bottom" or "page already at bottom",
  (b) you have walked every numbered page (1, 2, 3, …) to its end, or
  (c) infinite scroll is detected (page keeps growing without new unique items after several scrolls).

Walkthrough:
1. Open the URL. Wait until job cards are rendered.
2. For each visible job card, in order:
   a. Open the listing (click it or its detail panel) so the FULL job description is loaded.
   b. Extract: company, role title, location, term, application deadline, posting date, direct apply URL, required qualifications, preferred qualifications, responsibilities, compensation (if shown), and any other distinguishing detail (sponsorship, security clearance, remote/hybrid/onsite, etc.).
   c. cache_content the listing as a block tagged with "<Company> — <Role>" before moving on. Do NOT skip the cache step — anything not cached is lost when you scroll.
   d. Return to the result list.
3. After every card in the current viewport is processed: next_page exactly once. If the site uses numbered pages instead of scroll, click the next page button. Track "X of Y processed" in memory each step.
4. Repeat until a terminal condition above fires. Do not call done early.

Output:
Once every listing is collected, call generate_md_brief and save as:
  intern-insider-fall-2026-canada-math.md

Use this exact structure for the brief:

---
# Fall 2026 Internship Brief — Canada · Mathematics
Source: https://www.interninsider.me/dashboard?radiusKm=25&terms=Fall+2026&locations=Canada&majors=Mathematics
Collected: <today's date>
Total listings: <N>

## Instructions for Claude
You are acting as the user's career-strategy + writing assistant. The user will upload this brief together with their resume (separate file). For each listing in "## Jobs" below:
1. Score fit 1–10 against the resume, with a one-sentence justification.
2. List the 3 strongest resume → role matches (use specific resume bullets, not generic claims).
3. Call out any qualification gap and the single best way to address it in the application.
4. Draft a tailored cover letter, 300–400 words, that:
   - Opens with a specific reason this company / role matters (no "I am writing to apply for…", no "passionate about").
   - Maps two concrete resume experiences to the role's responsibilities.
   - Closes with a clear ask and the user's availability for the Fall 2026 term.
5. At the end, give an application order (rank-ordered list) and a one-line "why this order".

Tone: precise, confident, no filler. Mathematics-major framing. Canadian English spelling.

## Jobs

### 1. <Company> — <Role>
- Location: …
- Term: …
- Deadline: …
- Posted: …
- Apply: <URL>
- Required qualifications:
  - …
- Preferred qualifications:
  - …
- Responsibilities:
  - …
- Compensation: …
- Notes: …

### 2. <Company> — <Role>
…

(continue for every job, numbered, no omissions)

## Resume reference
The user's resume is attached as a separate file in this Claude conversation. Use it as the source of truth for all matching, scoring, and cover-letter drafting above. Do not invent experiences the resume does not contain.
---

Hard rules:
- No summarizing. List every job individually.
- If a field is not stated on the listing, write "not stated" — never invent.
- If a job is duplicated across pages, dedupe by company+role.
- Don't apply, don't click external "Apply" buttons — just record the URL.
- If the site requires login to view full descriptions, pause and ask me to sign in via human_interrupt.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: plain static HTML/CSS/JS, no build step, published from `docs/` on GitHub Pages. Chosen because the story is a single page and Pages serves static files directly; the only runtime dependency is the existing scoring API on Render.

## Users

- **Recruiters (served first):** scanning a candidate's portfolio for roughly a minute, often from a resume link. They need to grasp what was found and why it matters without ML background.
- **ML hiring managers and engineers (served in depth):** judging whether the author reasons carefully about data, leakage, validation and deployment. They will scroll, check numbers, and open the repo.

## Product Purpose

The paysim-fraud-detection project is a fraud model for mobile-money transfers, built on the PaySim dataset. The story site tells how it was built: the first model's 0.98 score turned out to be a one-line simulator shortcut, and the rest of the project is the work of removing it and building an honest model. Success: a reader leaves understanding the twist, trusting the honest number, and seeing the author as someone who checks their own results.

## Positioning

Most PaySim projects report ~0.99 and stop. This one shows that a single equality (`amount == oldbalanceOrg`, 97.8% of fraud vs 0.00% of legitimate transactions) reaches 0.975 PR-AUC, removes it, and reports what is left (0.634) with every decision made on time-ordered validation, including an admitted test-set peek and the label-free rule adopted because of it.

## Operating Context

- Reached from a resume, LinkedIn, or the GitHub repo's homepage link.
- The live scoring API runs on Render's free tier and sleeps when idle; the first request can take about a minute.
- Readers may compare claims against the repository README and `reports/` files.

## Capabilities and Constraints

- Numbers come only from pipeline outputs: `reports/metrics.json` (test results, review-cost sweep, drift) and `reports/experiments.json` (signature check, drift, feature-set and tuning folds). Nothing is hand-typed or invented.
- Live scoring: `POST /score` on https://paysim-fraud-detection-591g.onrender.com, returning score, decision, threshold and the top three exact SHAP contributions (log-odds). The API needs CORS for the Pages origin.
- Test set: last 15% of transactions by time (hours 378–743, 408,077 rows, 4,010 frauds).
- Undecided: whether a denser review-cost sweep (beyond the four computed points) is exported for the interactive slider.

## Brand Commitments

- First-person voice, credited to Dushyant Rajpurohit ("I trained…", "I caught it because…").
- The honesty of the account is the brand: mistakes and limits are stated, not hidden (the single-tree model, the test-set peek, PaySim being synthetic).

## Evidence on Hand

- `reports/metrics.json`, `reports/experiments.json`, `reports/pr_curve.png`.
- Four real test-set transactions used as demo presets (a caught fraud, a missed fraud, a legitimate transfer, a false alarm) in `static/index.html`.
- Repo: https://github.com/DushyantRajpurohit/paysim-fraud-detection (CI passing). Live demo as above.
- Absent and not to be fabricated: real-world payment data, testimonials, users, employer endorsements, or any accuracy claim beyond PaySim.

## Product Principles

1. The twist lands first: a recruiter gets the point within the first screen.
2. Every number is traceable to a file in the repo.
3. Show the mistakes; they are the evidence of judgement.
4. Interactive only where interaction teaches something (the threshold trade-off, the live score).
5. The page works without the live API; the API is a bonus, never a blocker.

## Accessibility & Inclusion

No product-specific requirement established beyond a standard accessible page; charts need text equivalents since the numbers are the content.

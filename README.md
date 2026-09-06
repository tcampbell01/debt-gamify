# Debt & Cash Flow Ledger

A private, mobile-friendly dashboard for tracking monthly cash flow and comparing debt avalanche and snowball payoff strategies.

## Use it locally

Open `index.html` in a browser. The dashboard has no server, login, analytics, or external database.

To enter your own numbers, edit the JSON between:

```html
<!-- LEDGER_DATA_START -->
<!-- LEDGER_DATA_END -->
```

Set `profile.isPlaceholder` to `false` after replacing the sample data.

## Install it on a phone

The repository includes a web app manifest, icon, and offline service worker. Installable web apps require HTTPS:

1. In GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose the default branch and the root folder.
4. Open the published URL on your phone.
5. Use **Add to Home Screen** in Safari or **Install app** in Chrome.

The hosted app contains the data committed to this repository. Do not commit sensitive financial details to a public repository.

## Twice-daily updates

Run the automation against a private local checkout and tell it to update only the JSON inside `index.html`. Email checks and phone completion notifications must be performed by the automation platform; the web app cannot access an inbox or run reliably in the background by itself.

Suggested task prompt:

> Open the repository's index.html. Read the current JSON between the LEDGER_DATA_START and LEDGER_DATA_END markers. Check my connected email inbox for anything new since the last check: statements, payment confirmations, autopay notices, or due-date reminders from credit card or loan providers. Update debt balances only when supported by a new statement. Add a new entry to the top of the alerts array describing what you found, using type info for routine updates, warn for possible missed payments or close due dates, and ok for cleared payments. Set lastChecked to the current time. Rewrite only the marked JSON, keeping the rest of the file untouched. Never fabricate data; when nothing new was found, add an alert saying so.

## Expected income

The Income Arrival Schedule accepts irregular income one payment at a time, such as a $200 gig on September 9 and $250 of teaching income on September 17. Expected payments are shown in the forecast but remain unavailable until they are explicitly marked received. Browser-entered income is kept in local storage and is not committed to GitHub.

## Plaid on AWS

The repository includes an AWS SAM backend for Plaid Sandbox. It creates three endpoints:

- `POST /plaid/link-token`
- `POST /plaid/exchange-token`
- `GET /plaid/sync`

Before deployment:

1. Create a Plaid account and obtain Sandbox credentials.
2. Create an AWS Secrets Manager secret containing JSON shaped like `{"clientId":"...","secret":"..."}`.
3. From the repository root, run `sam build` and `sam deploy --guided`.
4. Pass the secret ARN and the exact frontend origin when prompted.
5. Copy the `ApiUrl` stack output into `appConfig.plaidApiBase` in `index.html`.
6. Redeploy the frontend, then choose **Connect bank**.

Keep `PLAID_ENV` set to `sandbox` until account linking, token exchange, transaction sync, error handling, and access controls have been tested. Never add Plaid credentials or access tokens to this repository or browser code.

## Privacy

This app deliberately has no bank connector. If GitHub Pages is enabled for a public repository, anything stored in `index.html` is public. Use sample data publicly, or make the repository and hosting arrangement private before storing real account information.

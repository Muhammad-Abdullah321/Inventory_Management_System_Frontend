# EMS Frontend

React + Vite interface for the existing EMS API. The frontend lives separately from the backend and does not change the backend schema or modules.

## Run locally

1. Start the backend from `EMS_Backend` using `npm install` (once) and `npm run dev`. Its default port is `8500` as defined by the backend configuration.
2. In `frontend`, install packages with `npm install`.
3. Copy `.env.example` to `.env`. Keep `VITE_API_BASE_URL=/api`; set `VITE_BACKEND_ORIGIN` to the backend origin if it does not run at `http://localhost:8500`.
4. Run `npm run dev` from `frontend` and open `http://localhost:5173`.

The Vite development server proxies `/api` to `VITE_BACKEND_ORIGIN`, so local browser requests are same-origin and do not need backend CORS. The API base includes the `/api` prefix; endpoint paths in the client are relative to it. Backend secrets, JWT signing keys, database URLs, and Shopify webhook secrets must remain in the backend environment and are not frontend variables.

## API behavior reflected in the UI

- Sign-in calls `POST /api/auth/login`; the API returns `data.user` and `data.token`. The bearer token is stored in browser local storage and sent as `Authorization: Bearer <token>`. A `401` clears the session and returns the user to sign-in.
- All authenticated users can read dashboard, catalog, vendor, purchase, and movement data and can record purchase receipts.
- OWNER-only controls are shown for catalog/vendor writes, purchase payments, stock adjustments, and worker creation. Backend authorization remains authoritative.
- The backend does not expose product active status or general Shopify management endpoints. Shopify is an inbound signed inventory webhook only, so there is no Shopify admin page.
- The product API refuses deletion if any stock row or purchase, order, or movement history exists. Product creation creates stock rows, so the UI only offers delete when the API response shows no stock rows; the backend still validates the request.
- Vendor delete is exposed for OWNERs, but a vendor referenced by a purchase may not be deletable due to database relations. The API error is shown rather than hiding that failure.
- Dashboard figures are limited to values returned by the dashboard endpoint. Purchase totals and daily movement summaries use the selected date range; stock and payables are current totals.

## CORS and non-local deployments

The backend currently registers no CORS middleware (`cors` is a dependency, but `app.js` does not call it). The local Vite proxy avoids this. If a deployed browser frontend calls the backend directly from another origin, the browser will block it until CORS is enabled for the exact frontend origin. The smallest backend change is to import the existing `cors` package and register it before the API routes in `EMS_Backend/app.js`, for example:

```js
import cors from "cors";

app.use(cors({
  origin: "https://your-frontend.example",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

Replace the example origin with the deployed frontend origin; do not use a wildcard for an authenticated application. For direct cross-origin use, set `VITE_API_BASE_URL` to the backend URL including `/api`, such as `https://api.example.com/api`. No credentialed cookies are used by this frontend.

## Checks

Run `npm run build` from `frontend` to create the production bundle in `dist`. Live sign-in, authorization, data loading, and mutations still need manual verification against a running backend configured with a valid database and user account.

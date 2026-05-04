# NammaServe

NammaServe is a full-stack hyperlocal service booking platform inspired by Urban Company, but optimized for direct provider communication, affordable pricing, and strong local accessibility.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT
- Payments: Razorpay order creation and signature verification
- Communication: WhatsApp `wa.me` deep links

## Product Highlights

- Startup-style landing page with hero slider, category grid, trust section, offers, and nearby providers
- Tamil / English language toggle
- Light / dark mode
- Hyperlocal matching using stored provider coordinates plus distance filtering
- Role-based auth for `USER`, `PROVIDER`, `ADMIN`, and `SUPER_ADMIN`
- User booking flow with `CASH` or `RAZORPAY`
- Provider dashboard to manage job statuses
- Admin dashboard for users, providers, bookings, analytics, and platform settings
- Super admin flow to create admins and control platform settings

## Project Structure

```text
client/
server/
  config/
  controllers/
  middleware/
  models/
  routes/
  seed/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

- Copy `server/.env.example` to `server/.env`
- Copy `client/.env.example` to `client/.env`

3. Start MongoDB locally.

4. Initialize 2 dummy electrician providers:

```bash
npm run init:providers
```

5. Optional: seed the full sample dataset:

```bash
npm run seed
```

6. Start the app:

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`

## Seed Accounts

After `npm run init:providers`:

- Provider samples:
  - Email: `gokul.katpadi@nammaserve.in`
  - Password: `Provider@123`
  - Email: `northline.anna@nammaserve.in`
  - Password: `Provider@123`

After `npm run seed`:

- Super admin:
  - Email: `founder@nammaserve.in`
  - Password: `Admin@123`
- Provider samples:
  - Email: `gokul.katpadi@nammaserve.in`
  - Password: `Provider@123`
  - Email: `arunachala.plumbing@nammaserve.in`
  - Password: `Provider@123`
  - Email: `northline.anna@nammaserve.in`
  - Password: `Provider@123`

Create a customer account from the UI for user bookings.

## Razorpay

Set these values in `server/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret
```

Set the publishable key in `client/.env` if you want it available on the client side:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_your_key
```

## API Surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/services`
- `GET /api/providers`
- `GET /api/providers/by-service/:serviceName`
- `GET /api/providers/nearby`
- `POST /api/bookings`
- `GET /api/bookings/mine`
- `POST /api/payments/orders/:bookingId`
- `POST /api/payments/verify`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/providers`
- `GET /api/admin/bookings`

## Verification

- Server JavaScript syntax checked with `node --check`
- Frontend production build verified with `npm run build --workspace client`

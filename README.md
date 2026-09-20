# Nortex Travel Expense Reimbursement

A MERN prototype where employees raise travel requests, managers approve them along a policy-driven chain, and Finance verifies and releases payment.

## Run it

Prerequisites: Node.js 18+ and a MongoDB instance (local or Atlas).

```bash
# 1. backend
cd backend
npm install
# create .env with:
#   PORT=5000
#   MONGO_URI=<your mongo uri>
#   JWT_SECRET=<any long string>
#   JWT_EXPIRES_IN=7d
#   CLIENT_URL=http://localhost:5173
npm run seed     # loads users from employee_master.csv + one admin
npm run dev      # http://localhost:5000

# 2. frontend (new terminal)
cd frontend
npm install
# create .env with:
#   VITE_API_URL=http://localhost:5000
npm run dev      # http://localhost:5173
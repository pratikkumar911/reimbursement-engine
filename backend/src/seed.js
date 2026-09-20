const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const USERS = [
  { empCode: 'NX-4471', name: 'Chaitanya Reddy', email: 'chaitanya.reddy@nortexindustries.com', designation: 'Manager - Key Accounts', department: 'Sales', costCentre: 'CE110', city: 'Pune', reportingManagerCode: 'NX-2210', role: 'Employee' },
  { empCode: 'NX-2210', name: 'Suresh Iyer', email: 'suresh.iyer@nortexindustries.com', designation: 'Deputy General Manager', department: 'Sales', costCentre: 'CE110', city: 'Pune', reportingManagerCode: 'NX-1108', role: 'Reporting Manager' },
  { empCode: 'NX-1108', name: 'Meera Krishnan', email: 'meera.krishnan@nortexindustries.com', designation: 'Head of Department - Sales', department: 'Sales', costCentre: 'CE100', city: 'Mumbai', reportingManagerCode: 'NX-1002', role: 'Head of Department' },
  { empCode: 'NX-1002', name: 'Arvind Rao', email: 'arvind.rao@nortexindustries.com', designation: 'Head of Division - Commercial', department: 'Commercial', costCentre: 'CE001', city: 'Mumbai', reportingManagerCode: 'NX-1000', role: 'Head of Division' },
  { empCode: 'NX-1000', name: 'Nandita Shah', email: 'nandita.shah@nortexindustries.com', designation: 'Managing Director', department: 'Corporate', costCentre: 'CE001', city: 'Mumbai', reportingManagerCode: '', role: 'MD' },
  { empCode: 'NX-3305', name: 'Ravi Menon', email: 'ravi.menon@nortexindustries.com', designation: 'Manager - Finance Shared Services', department: 'Finance', costCentre: 'CE900', city: 'Pune', reportingManagerCode: 'NX-3300', role: 'Finance' },
  { empCode: 'NX-3300', name: 'Kavitha Balan', email: 'kavitha.balan@nortexindustries.com', designation: 'Controller', department: 'Finance', costCentre: 'CE900', city: 'Pune', reportingManagerCode: 'NX-1002', role: 'Finance' },
  { empCode: 'NX-5182', name: 'Deepa Nair', email: 'deepa.nair@nortexindustries.com', designation: 'Manager - Presales', department: 'Sales', costCentre: 'CE110', city: 'Chennai', reportingManagerCode: 'NX-2210', role: 'Employee' },
  { empCode: 'NX-4490', name: 'Imran Qureshi', email: 'imran.qureshi@nortexindustries.com', designation: 'Executive - Sales', department: 'Sales', costCentre: 'CE110', city: 'Pune', reportingManagerCode: 'NX-2210', role: 'Employee' },
  { empCode: 'ADMIN-1', name: 'Admin User', email: 'admin@nortexindustries.com', designation: 'System Admin', department: 'IT', costCentre: 'CE000', city: 'Pune', reportingManagerCode: '', role: 'Admin' }
];

(async () => {
  await connectDB();
  await User.deleteMany({});
  const hash = await bcrypt.hash('password123', 10);
  await User.insertMany(USERS.map(u => ({ ...u, passwordHash: hash })));
  console.log(`Seeded ${USERS.length} users. Password for all: password123`);
  await mongoose.disconnect();
})();
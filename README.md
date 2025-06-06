GigVault is a dynamic Web3-powered talent marketplace built to connect job seekers with project owners in the crypto, blockchain, and tech space. The platform enables seamless job applications, applicant management, in-site wallet funding, and premium perks – all in a sleek, responsive interface tailored for both freelance workers and project teams.

🚀 Features

🔐 User authentication system (Seeker & Owner roles)

💼 Owners can post jobs and view applicants

📬 Seekers can apply to jobs with a custom message

✅ Owners can accept applicants and trigger payment transfers

💳 In-site wallet with fund, transfer, and transaction history features

🏅 Premium membership with job visibility priority and analytics

📊 Premium analytics dashboard for both seekers and owners

📥 Notification system for job acceptance alerts

🔍 Job search with filters and premium delay logic

🧠 Smart recommendation system based on seeker history



---

🛠 Tech Stack

Frontend:

HTML5

CSS3 (Bootstrap 5)

EJS templating engine


Backend:

Node.js

Express.js

MySQL (via MySQL2 driver)

Session-based auth with Express-session


Database:

MySQL

Tables: users, jobs, applications, notifications, transactions


Security & Logic:

Role-based access control

Premium gating

Wallet fund validation

Rejection of other applicants upon acceptance




---

📁 Project Structure

gigvault/
├── config/
│   └── db.js               # MySQL connection
├── controllers/
│   └── dashboardController.js
├── middleware/
│   └── auth.js             # Premium check middleware
├── routes/
│   └── dashboard.js
├── views/
│   ├── seeker_dashboard.ejs
│   ├── owner_dashboard.ejs
│   └── ...
├── public/
│   ├── css/
│   └── img/
├── app.js                  # Main Express app
└── package.json


---

⚙ Setup & Installation

git clone https://github.com/your-username/gigvault.git
cd gigvault
npm install

Setup your .env or config/db.js with your MySQL credentials.

Run MySQL and import the included gigvault.sql schema.

Start the server:


node app.js


---

📌 Status

GigVault is under active development. Additional features planned:

Escrow payments

Rating system

In-app chat

Web3 wallet integration (MetaMask, Phantom)

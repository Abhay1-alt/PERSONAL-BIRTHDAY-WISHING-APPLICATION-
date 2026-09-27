# 🎂 Automatic Birthday Wishing Application

A full-stack automated birthday wishing application that tracks birthdays and sends personalized, timely birthday greetings across multiple communication channels such as **Email, SMS, and Custom Webhooks** — completely without manual intervention.

---

## 🚀 Features

### ⏰ Automated Birthday Scheduler

Automatically checks the database for birthdays and triggers birthday wishes at the configured time.

* Daily background job
* Automated birthday detection
* Configurable scheduling
* Prevents duplicate birthday wishes
* Supports timezone-aware scheduling

### 📩 Multi-Channel Messaging

Send personalized birthday wishes through multiple communication channels:

* 📧 Email
* 📱 SMS
* 🔗 Custom Webhooks

Supported integrations can include:

* Nodemailer / SMTP
* SendGrid
* Twilio
* Custom Webhook APIs

### ✨ Dynamic Wish Templates

Create personalized birthday messages using dynamic variables.

Example:

```text
Happy Birthday, {{name}}! 🎉

Wishing you a wonderful {{age}}th birthday!

{{customNote}}
```

Supported variables can include:

```text
{{name}}
{{age}}
{{customNote}}
{{date}}
```

### 👥 Recipient Management

Complete CRUD functionality for managing birthday contacts.

Users can:

* Add contacts
* View contacts
* Update contact information
* Update date of birth
* Delete contacts
* Configure preferred communication channels
* Configure timezone

### 🌍 Timezone Awareness

The application supports timezone-aware birthday delivery.

For example:

```text
Contact A → Asia/Kolkata
Contact B → America/New_York
Contact C → Europe/London
```

The system calculates the appropriate delivery time according to each recipient's timezone.

### 📊 Delivery Status & History

Track every birthday message sent by the system.

Example statuses:

```text
PENDING
SENT
DELIVERED
FAILED
RETRYING
```

The system maintains:

* Delivery history
* Failed attempts
* Retry attempts
* Provider responses
* Timestamps
* Communication channel

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │ React / Next.js     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      REST API       │
                    │ Node.js + Express   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ PostgreSQL │   │   Redis    │   │ Scheduler  │
       │ / MongoDB  │   │ Queue      │   │ Worker     │
       └────────────┘   └────────────┘   └─────┬──────┘
                                                │
                         ┌──────────────────────┼──────────────────────┐
                         │                      │                      │
                         ▼                      ▼                      ▼
                  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                  │    Email    │       │     SMS     │       │   Webhook   │
                  │   Provider  │       │   Twilio    │       │   Provider  │
                  └─────────────┘       └─────────────┘       └─────────────┘
```

---

# 🛠️ Tech Stack

## Backend

* Node.js
* Express.js
* REST API
* JavaScript / TypeScript

Alternative backend implementations can use:

* Python
* FastAPI
* Django

## Database

Supported database options:

* PostgreSQL
* MongoDB
* MySQL

The recommended production database is **PostgreSQL**.

## Scheduling & Background Jobs

Possible implementations:

* `node-cron`
* Redis + BullMQ
* APScheduler
* Celery

For production deployments, a queue-based architecture such as **Redis + BullMQ** is recommended.

## Messaging

### Email

* Nodemailer
* SMTP
* SendGrid

### SMS

* Twilio

### Webhooks

* Custom HTTP Webhooks
* REST APIs

---

# 📁 Project Structure

```text
birthday-wishing-app/
│
├── config/
│   ├── database.js
│   ├── env.js
│   └── logger.js
│
├── controllers/
│   ├── contactController.js
│   ├── templateController.js
│   ├── triggerController.js
│   └── logController.js
│
├── models/
│   ├── Contact.js
│   ├── Template.js
│   └── DeliveryLog.js
│
├── routes/
│   ├── contactRoutes.js
│   ├── templateRoutes.js
│   ├── triggerRoutes.js
│   └── logRoutes.js
│
├── services/
│   ├── schedulerService.js
│   ├── birthdayService.js
│   ├── templateService.js
│   ├── emailService.js
│   ├── smsService.js
│   └── webhookService.js
│
├── workers/
│   └── birthdayWorker.js
│
├── templates/
│   ├── birthday-email.html
│   └── birthday-message.txt
│
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── rateLimiter.js
│
├── utils/
│   ├── dateUtils.js
│   ├── ageCalculator.js
│   ├── validators.js
│   └── logger.js
│
├── tests/
│
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

# ⚙️ Prerequisites

Before running the project, make sure you have:

* Node.js v18+
* npm
* PostgreSQL / MongoDB / MySQL
* SMTP credentials for email
* Twilio credentials for SMS
* Redis if using a queue-based worker

---

# 🔧 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Abhay1-alt/PERSONAL-BIRTHDAY-WISHING-APPLICATION-.git

cd PERSONAL-BIRTHDAY-WISHING-APPLICATION-
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file:

```env
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/birthday_db

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Scheduler
CRON_SCHEDULE=0 0 * * *

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
```

> Never commit your `.env` file or API credentials to GitHub.

---

# ▶️ Running the Application

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

The API will be available at:

```text
http://localhost:5000
```

---

# 🔌 API Endpoints

## 👥 Contact Management

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| GET    | `/api/contacts`     | Get all contacts       |
| GET    | `/api/contacts/:id` | Get a specific contact |
| POST   | `/api/contacts`     | Create a contact       |
| PUT    | `/api/contacts/:id` | Update a contact       |
| DELETE | `/api/contacts/:id` | Delete a contact       |

### Example Request

```http
POST /api/contacts
```

```json
{
  "name": "Rahul",
  "dateOfBirth": "2002-09-27",
  "email": "rahul@example.com",
  "phone": "+919876543210",
  "timezone": "Asia/Kolkata",
  "channels": [
    "email",
    "sms"
  ]
}
```

---

# 📝 Template Management

| Method | Endpoint             | Description     |
| ------ | -------------------- | --------------- |
| GET    | `/api/templates`     | Get templates   |
| POST   | `/api/templates`     | Create template |
| PUT    | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |

Example template:

```text
Happy Birthday, {{name}}! 🎂🎉

Wishing you a fantastic {{age}}th birthday!

{{customNote}}

Have an amazing day!
```

---

# 🚀 Manual Trigger

The birthday process can also be triggered manually for testing.

```http
POST /api/trigger-wishes
```

Example response:

```json
{
  "success": true,
  "message": "Birthday wish process triggered successfully",
  "processed": 5
}
```

---

# 📊 Delivery Logs

Retrieve delivery history:

```http
GET /api/logs
```

Example response:

```json
{
  "id": "log_123",
  "contactId": "contact_456",
  "channel": "email",
  "status": "SENT",
  "sentAt": "2026-09-27T00:00:00Z",
  "provider": "smtp"
}
```

---

# ⏰ Automated Birthday Workflow

The automated workflow works as follows:

```text
                    Scheduler
                        │
                        ▼
              Check Current Date
                        │
                        ▼
              Find Birthday Contacts
                        │
                        ▼
                Check Timezone
                        │
                        ▼
              Load Message Template
                        │
                        ▼
              Populate Variables
                        │
                        ▼
             Select Communication
                    Channel
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        Email          SMS         Webhook
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                Delivery Attempt
                        │
               ┌────────┴────────┐
               ▼                 ▼
             Success            Failure
               │                 │
               ▼                 ▼
             Log              Retry Queue
```

---

# 🔄 Birthday Processing Logic

Every scheduled execution performs the following steps:

### Step 1 — Check Date

The scheduler determines the current date and timezone.

### Step 2 — Find Birthdays

The system searches for contacts whose:

```text
birth month == current month
AND
birth day == current day
```

### Step 3 — Calculate Age

The application calculates the recipient's current age.

Example:

```text
Date of Birth:
27 September 2002

Current Date:
27 September 2026

Age:
24
```

### Step 4 — Populate Template

Variables are replaced dynamically.

```text
{{name}}
{{age}}
{{customNote}}
```

### Step 5 — Send Message

The system selects the configured communication channel.

```text
Email
SMS
Webhook
```

### Step 6 — Record Delivery

The delivery result is stored.

```text
SENT
FAILED
RETRYING
```

### Step 7 — Prevent Duplicates

The system ensures the same birthday message is not accidentally sent multiple times in the same year.

---

# 🌍 Timezone Handling

Each contact can have an individual timezone.

Example:

```text
Rahul
Asia/Kolkata

John
America/New_York

David
Europe/London
```

The system calculates the appropriate delivery time based on the recipient's timezone rather than relying only on the server's timezone.

Recommended timezone format:

```text
IANA Time Zone Database
```

Examples:

```text
Asia/Kolkata
America/New_York
Europe/London
Asia/Tokyo
```

---

# 🔁 Retry System

Failed messages can automatically be retried.

Example:

```text
Attempt 1
    ↓
FAILED
    ↓
Wait
    ↓
Attempt 2
    ↓
FAILED
    ↓
Wait
    ↓
Attempt 3
    ↓
SUCCESS
```

Recommended retry strategy:

```text
Exponential Backoff
```

Example:

```text
1 minute
5 minutes
15 minutes
30 minutes
```

Maximum retry attempts should be configurable.

---

# 🔐 Security

The application should implement:

* Environment variables for secrets
* Input validation
* Authentication
* Authorization
* Rate limiting
* Secure HTTP headers
* CORS configuration
* Request validation
* SQL/NoSQL injection protection
* XSS protection
* API abuse protection
* Secure webhook validation
* Structured logging

Never store API credentials directly in source code.

---

# 🧪 Testing

The application should include:

### Unit Tests

Test:

* Age calculation
* Date matching
* Template replacement
* Timezone conversion
* Validation

### Integration Tests

Test:

* Contact creation
* Contact updates
* Birthday processing
* Message delivery
* Delivery logging

### Scheduler Tests

Test:

```text
Birthday today
Birthday tomorrow
Birthday yesterday
Leap-year birthday
Different timezones
Duplicate prevention
Failed delivery
Retry processing
```

---

# 📈 Future Improvements

Potential future features include:

* React/Next.js dashboard
* Google Calendar integration
* WhatsApp Business API
* Telegram integration
* Discord webhooks
* Slack notifications
* Birthday reminder notifications
* Multiple templates
* Template preview
* AI-generated birthday wishes
* User accounts
* Team accounts
* Analytics dashboard
* Delivery analytics
* Custom scheduling
* Recurring campaigns
* Contact import from CSV
* Contact import from Google Contacts
* Docker deployment
* Cloud deployment
* Redis-based distributed workers

---

# 🧠 AI Birthday Message Generator

An optional AI module can generate personalized birthday wishes based on:

```text
Name
Age
Relationship
Interests
Custom notes
Preferred tone
```

Example:

```text
Tone:
Funny

Relationship:
Best Friend

Interest:
Cricket
```

Generated message:

```text
Happy Birthday, Rahul! 🎂

Another year older and hopefully another year closer to
finally beating us at cricket! 😂

Have an amazing birthday and an even better year ahead!
```

The AI should never send a message automatically without respecting the user's configured approval/automation settings.

---

# 🚀 Production Architecture

For a production deployment, the recommended architecture is:

```text
                  ┌──────────────────┐
                  │     Frontend     │
                  │   React / Next   │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   Load Balancer  │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │    REST API      │
                  │ Node + Express   │
                  └────────┬─────────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
       PostgreSQL        Redis       Object Storage
             │             │
             │             ▼
             │       ┌──────────────┐
             │       │ Job Workers  │
             │       └──────┬───────┘
             │              │
             │       ┌──────┼──────┐
             │       ▼      ▼      ▼
             │     Email    SMS   Webhook
             │
             ▼
       Delivery Logs
```

---

# 📜 License

This project is distributed under the **MIT License**.

See the `LICENSE` file for more information.

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/NewFeature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push the branch.

```bash
git push origin feature/NewFeature
```

5. Open a Pull Request.

---

# 👨‍💻 Author

**Abhay Mishra**

GitHub:

```text
https://github.com/Abhay1-alt
```

---

## ⭐ Project Goal

The goal of this project is to demonstrate practical implementation of:

* REST API development
* Database design
* Background workers
* Cron scheduling
* Timezone handling
* Third-party API integration
* Email automation
* SMS automation
* Webhook integration
* Retry mechanisms
* Delivery tracking
* Authentication
* Production-oriented backend architecture

If you find this project useful, consider giving it a ⭐ on GitHub.

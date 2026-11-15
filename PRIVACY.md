# Privacy Policy for Outbound Pilot

**Effective Date:** November 15, 2026  
**Last Updated:** November 15, 2026

Outbound Pilot ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy describes how we collect, use, and protect your information when you connect your Google Workspace or Gmail account to our application.

---

### 1. Information We Collect

When you authenticate your Google Account with Outbound Pilot, we access the following information with your explicit permission:
- **Email Address & Basic Profile Information:** To identify your account and display your active sender identity.
- **Gmail Send Permissions (`https://www.googleapis.com/auth/gmail.send`):** To dispatch cold outbound emails that you explicitly approve within the SDR campaign dashboard.
- **OAuth Tokens:** Short-lived access tokens and encrypted refresh tokens required to communicate with the Gmail API on your behalf.

We **do not** read, store, or access your personal inbox messages, read other emails, or collect contacts outside the target leads you intentionally upload into the campaign pipeline.

---

### 2. How We Use Your Information

We use the Google account data strictly to:
- Dispatch outbound SDR emails from your authenticated email address upon your manual approval or automated pipeline rules.
- Log dispatch audit records (status, timestamp, recipient, subject) within your private dashboard.
- Verify delivery status and monitor deliverability health.

We do **not** sell your personal data. We do **not** use your Google user data for training generalized artificial intelligence or machine learning models.

---

### 3. Google API Limited Use Disclosure

Outbound Pilot's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements.

Specifically:
1. We only use Google data to provide and improve user-facing features that are prominent in the user interface.
2. We do not transfer this data to third parties unless necessary to provide or improve these features, comply with applicable law, or as part of a merger/acquisition with user consent.
3. We do not use or transfer this data for serving advertisements.
4. We do not allow humans to read your data unless you provide explicit consent for specific messages, for security purposes (e.g. investigating abuse), to comply with applicable law, or for the application's internal operations when data is aggregated and anonymized.

---

### 4. Data Storage and Security

- Your OAuth tokens are stored securely in PostgreSQL with encryption at rest and strict role-based access control.
- All network communication with Google APIs occurs exclusively over encrypted Transport Layer Security (TLS/HTTPS).
- You can revoke Outbound Pilot's access at any time via the in-app "Disconnect Mailbox" button or directly from your [Google Account Security Settings](https://myaccount.google.com/permissions).

---

### 5. Contact Us

If you have questions or concerns regarding this Privacy Policy or your data, please contact:
- **Application:** Outbound Pilot
- **Repository:** https://github.com/adarshcode007/OutboundPilot
- **Support Email:** adarshh7373@gmail.com

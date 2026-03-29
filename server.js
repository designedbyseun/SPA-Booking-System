'use strict';

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
app.use(cors());
app.use(express.json());

const PORT           = process.env.PORT || 3000;
const BREVO_API_KEY  = process.env.BREVO_API_KEY;

/* ============================================================
   SEND EMAIL VIA BREVO HTTP API
   ============================================================ */
async function sendEmail({ to, subject, html, replyTo }) {
  const body = {
    sender:  { name: 'SPA Ajibade Booking', email: 'spaajibadebooking@gmail.com' },
    to:      [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (replyTo) body.replyTo = { email: replyTo };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'api-key':      BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Brevo API error');
  }

  return response.json();
}

/* ============================================================
   EMAIL TEMPLATE — Staff notification
   ============================================================ */
function generateStaffEmail(data) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; font-size: 11px; color: #333333; line-height: 1.6; padding: 20px; max-width: 600px;">

      <p style="margin: 0 0 12px 0;">Hello Team,</p>
      <p style="margin: 0 0 18px 0;">A new client booking has been submitted via the Spaajibade website. Please review the details below and take the necessary action.</p>

      <div style="border-top: 1px solid #333333; margin: 0 0 12px 0;"></div>
      <div style="font-weight: bold; margin-bottom: 8px;">Client Information</div>
      <div style="margin-bottom: 4px;">First Name: ${data.firstName}</div>
      <div style="margin-bottom: 4px;">Last Name: ${data.lastName}</div>
      <div style="margin-bottom: 4px;">Email Address: ${data.email}</div>
      <div style="margin-bottom: 12px;">Phone Number: ${data.phoneNumber || 'Not provided'}</div>
      <div style="border-top: 1px solid #333333; margin: 0 0 12px 0;"></div>

      <div style="font-weight: bold; margin-bottom: 8px;">Booking Details</div>
      <div style="margin-bottom: 4px;">Preferred Date: ${data.date}</div>
      <div style="margin-bottom: 12px;">Preferred Time: ${data.time}</div>
      <div style="border-top: 1px solid #333333; margin: 0 0 12px 0;"></div>

      <div style="font-weight: bold; margin-bottom: 8px;">Client Request</div>
      <div style="margin-bottom: 18px; white-space: pre-wrap;">${data.description || 'No specific description provided.'}</div>

      <div style="font-weight: bold; margin-bottom: 8px;">Action Required</div>
      <ul style="margin: 0 0 18px 0; padding-left: 18px;">
        <li style="margin-bottom: 5px;">Review the client's request and confirm availability.</li>
        <li style="margin-bottom: 5px;">Assign the appropriate staff member if necessary.</li>
        <li style="margin-bottom: 5px;">Contact the client to confirm or reschedule the session.</li>
        <li style="margin-bottom: 5px;">Update the booking status in your system if applicable.</li>
      </ul>

      <p style="margin: 0 0 24px 0;">Please ensure this booking is handled promptly to maintain a smooth and professional client experience.</p>

      <div style="margin-bottom: 4px;">Best regards,</div>
      <div style="margin-bottom: 4px;">Spa Ajibade &amp; Co.</div>
      <div style="margin-bottom: 0;">Booking System</div>

    </body>
    </html>
  `;
}

/* ============================================================
   EMAIL TEMPLATE — Client confirmation
   ============================================================ */
function generateClientEmail(data) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; font-size: 11px; color: #333333; line-height: 1.6; padding: 20px; max-width: 600px;">

      <p style="margin: 0 0 12px 0;">Dear ${data.firstName},</p>
      <p style="margin: 0 0 18px 0;">Thank you for reaching out to SPA Ajibade &amp; Co. We have received your appointment request and a member of our team will be in touch shortly to confirm your booking.</p>

      <div style="border-top: 1px solid #333333; margin: 0 0 12px 0;"></div>
      <div style="font-weight: bold; margin-bottom: 8px;">Your Booking Summary</div>
      <div style="margin-bottom: 4px;">Preferred Date: ${data.date}</div>
      <div style="margin-bottom: 4px;">Preferred Time: ${data.time}</div>
      <div style="margin-bottom: 12px;">Assigned To: ${data.staffName}</div>
      <div style="border-top: 1px solid #333333; margin: 0 0 18px 0;"></div>

      <p style="margin: 0 0 24px 0;">If you have any urgent enquiries, please do not hesitate to contact us directly.</p>

      <div style="margin-bottom: 4px;">Best regards,</div>
      <div style="margin-bottom: 4px;">Spa Ajibade &amp; Co.</div>
      <div style="margin-bottom: 0;">Legal Practitioners, Arbitrators and Notaries Public</div>

    </body>
    </html>
  `;
}

/* ============================================================
   API ENDPOINT
   ============================================================ */
app.post('/api/book', async (req, res) => {
  const { staffEmail, ...bookingData } = req.body;

  if (!staffEmail || !bookingData.firstName || !bookingData.email) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
  }

  console.log(`[${new Date().toISOString()}] Booking from ${bookingData.firstName} ${bookingData.lastName} → ${staffEmail}`);

  try {
    // Email 1 — notify staff
    await sendEmail({
      to:      staffEmail,
      subject: `New Appointment Request: ${bookingData.firstName} ${bookingData.lastName}`,
      html:    generateStaffEmail(bookingData),
      replyTo: bookingData.email,
    });

    // Email 2 — confirm to client
    await sendEmail({
      to:      bookingData.email,
      subject: 'We have received your booking request — SPA Ajibade & Co.',
      html:    generateClientEmail(bookingData),
    });

    res.status(200).json({ success: true, message: 'Booking notifications sent.' });
  } catch (error) {
    console.error('Email Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send email notification.', error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('SPA Ajibade Booking Server is live.');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
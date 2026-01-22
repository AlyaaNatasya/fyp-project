const nodemailer = require("nodemailer");

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send reminder email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} reminderTitle - Title of the reminder
 * @param {string} reminderDescription - Description of the reminder
 * @param {string} reminderDate - Due date of the reminder
 * @param {string} reminderCategory - Category of the reminder
 */
const sendReminderEmail = async (
  userEmail,
  userName,
  reminderTitle,
  reminderDescription,
  reminderDate,
  reminderCategory,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"StudyBloom" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `📅 Reminder: ${reminderTitle} is due tomorrow!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px;
            }
            .reminder-card {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .reminder-title {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .reminder-info {
              color: #666;
              line-height: 1.6;
            }
            .reminder-date {
              color: #667eea;
              font-weight: bold;
              margin-top: 10px;
            }
            .category-badge {
              display: inline-block;
              background-color: #667eea;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 12px;
              margin-top: 10px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Reminder Notification</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>This is a friendly reminder that you have an upcoming task due tomorrow:</p>
              
              <div class="reminder-card">
                <div class="reminder-title">${reminderTitle}</div>
                <div class="reminder-info">
                  ${reminderDescription ? `<p>${reminderDescription}</p>` : ""}
                  <div class="reminder-date">📅 Due Date: ${new Date(reminderDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                  ${reminderCategory ? `<span class="category-badge">${reminderCategory}</span>` : ""}
                </div>
              </div>
              
              <p>Make sure to complete this task on time. Good luck! 🎯</p>
              <p>Best regards,<br>NotePetal Team ♥</p>
            </div>
            <div class="footer">
              <p>You received this email because you have reminders set up in your NotePetal account.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://127.0.0.1:5001'}/pages/calendar.html">Manage your reminders</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return false;
  }
};

module.exports = {
  sendReminderEmail,
};

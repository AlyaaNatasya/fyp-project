const cron = require('node-cron');
const pool = require('../config/db');
const { sendReminderEmail } = require('../services/emailService');

/**
 * Check for reminders due tomorrow and send email notifications
 * This runs daily at 9:00 AM
 */
const checkRemindersDueTomorrow = async () => {
  try {
    console.log('🔍 Checking for reminders due tomorrow...');

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Query reminders that are due tomorrow and haven't had email sent yet
    const [reminders] = await pool.execute(
      `SELECT 
        r.id as reminder_id,
        r.title,
        r.description,
        r.category,
        r.date,
        u.email as user_email,
        u.name as user_name
       FROM reminders r
       JOIN users u ON r.user_id = u.id
       WHERE DATE(r.date) = ? 
       AND r.email_sent = FALSE
       ORDER BY r.date ASC`,
      [tomorrowDate]
    );

    if (reminders.length === 0) {
      console.log('✅ No reminders due tomorrow found.');
      return;
    }

    console.log(`📧 Found ${reminders.length} reminder(s) due tomorrow. Sending emails...`);

    let successCount = 0;
    let failCount = 0;

    for (const reminder of reminders) {
      try {
        // Send email
        const emailSent = await sendReminderEmail(
          reminder.user_email,
          reminder.user_name,
          reminder.title,
          reminder.description,
          reminder.date,
          reminder.category
        );

        if (emailSent) {
          // Mark email as sent in database
          await pool.execute(
            'UPDATE reminders SET email_sent = TRUE WHERE id = ?',
            [reminder.reminder_id]
          );
          successCount++;
          console.log(`✅ Email sent for reminder ID: ${reminder.reminder_id}`);
        } else {
          failCount++;
          console.error(`❌ Failed to send email for reminder ID: ${reminder.reminder_id}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error processing reminder ID: ${reminder.reminder_id}`, error);
      }
    }

    console.log(`📊 Reminder check completed: ${successCount} emails sent, ${failCount} failed.`);
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
};

/**
 * Start the reminder scheduler
 * Runs every day at 9:00 AM
 */
const startReminderScheduler = () => {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Running scheduled reminder check at 9:00 AM');
    checkRemindersDueTomorrow();
  });

  console.log('📅 Reminder scheduler started. Will check daily at 9:00 AM');
  
  // Optional: Run once on startup for testing (comment out in production)
  // console.log('🧪 Running initial check on startup...');
  // checkRemindersDueTomorrow();
};

module.exports = {
  startReminderScheduler,
  checkRemindersDueTomorrow
};
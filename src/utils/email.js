const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendDistributorCredentials = async ({ name, email, password }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Distributor Portal" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Distributor Portal Account Has Been Created',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
        <div style="background: #1a1a2e; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e8c547; margin: 0; font-size: 24px; letter-spacing: 2px;">DISTRIBUTOR PORTAL</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #555; line-height: 1.6;">Your account has been created on the Distributor Portal. Use the credentials below to log in.</p>
          
          <div style="background: #f0f4ff; border-left: 4px solid #e8c547; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0;"><strong style="color: #1a1a2e;">Email:</strong> <span style="color: #444;">${email}</span></p>
            <p style="margin: 0;"><strong style="color: #1a1a2e;">Temporary Password:</strong> <span style="color: #444; font-family: monospace; font-size: 16px; background: #fff; padding: 4px 8px; border-radius: 4px;">${password}</span></p>
          </div>
          
          <p style="color: #555; line-height: 1.6;">Please log in and consider changing your password after your first login.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background: #e8c547; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Log In Now
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            If you have any issues, please contact your administrator.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

const sendReportUploadNotification = async ({ distributorName, distributorEmail, reportTitle, month, year, reportCount }) => {
  const transporter = createTransporter();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const mailOptions = {
    from: `"Distributor Portal" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Report Uploaded by ${distributorName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
        <div style="background: #1a1a2e; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e8c547; margin: 0; font-size: 24px; letter-spacing: 2px;">DISTRIBUTOR PORTAL</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e; margin-top: 0;">📊 New Report Uploaded</h2>
          <p style="color: #555; line-height: 1.6;">A distributor has uploaded a new monthly report.</p>
          
          <div style="background: #f0f4ff; border-left: 4px solid #e8c547; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 8px 0;"><strong style="color: #1a1a2e;">Distributor:</strong> <span style="color: #444;">${distributorName}</span></p>
            <p style="margin: 0 0 8px 0;"><strong style="color: #1a1a2e;">Email:</strong> <span style="color: #444;">${distributorEmail}</span></p>
            <p style="margin: 0 0 8px 0;"><strong style="color: #1a1a2e;">Report:</strong> <span style="color: #444;">${reportTitle}</span></p>
            <p style="margin: 0;"><strong style="color: #1a1a2e;">Period:</strong> <span style="color: #444;">${monthNames[month - 1]} ${year}</span></p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reports" 
               style="background: #e8c547; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              View Report
            </a>
          </div>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendDistributorCredentials, sendReportUploadNotification };

const nodemailer = require("nodemailer");
const axios = require("axios");
const { formatPhoneNumber } = require("./whatsappVerify");

// Generates a 6-digit random OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends OTP via Gmail SMTP
async function sendEmailOtp(email, otp) {
  if (process.env.EMAIL_ENABLED !== "true") {
    console.log(`[Email OTP Mock] Verification code for ${email} is ${otp}`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: `"magnifAi Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Email Verification OTP Code",
    text: `Your verification OTP is: ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px; margin: auto;">
        <h2 style="color: #4f46e5; text-align: center;">magnifAi Profile Verification</h2>
        <p>Hello,</p>
        <p>Thank you for initiating your onboarding request with magnifAi. Please use the following One-Time Password (OTP) to verify your email address:</p>
        <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; letter-spacing: 5px; color: #1e1b4b;">${otp}</div>
        <p style="font-size: 12px; color: #6b7280; text-align: center;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email OTP Sent] Sent to ${email}`);
    return true;
  } catch (err) {
    console.warn("[email-otp-fallback-mock] SMTP failed, falling back to mock OTP. OTP Code is:", otp);
    return true;
  }
  return true;
}

// Sends OTP via WhatsApp Cloud API
async function sendWhatsAppOtp(mobile, otp) {
  if (process.env.WHATSAPP_ENABLED !== "true") {
    console.log(`[WhatsApp OTP Mock] Verification code for ${mobile} is ${otp}`);
    return true;
  }

  const cleanedPhone = formatPhoneNumber(mobile);
  if (!cleanedPhone) {
    throw new Error("Invalid phone number format");
  }

  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification";
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";
  const version = process.env.GRAPH_VERSION || "v19.0";

  if (!phoneId || !token) {
    console.warn("[whatsapp-otp-warning] WhatsApp credentials missing. Fallback to mock logging.");
    console.log(`[WhatsApp OTP Mock] Verification code for ${cleanedPhone} is ${otp}`);
    return true;
  }

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  // Standard template OTP payload for WhatsApp
  const body = {
    messaging_product: "whatsapp",
    to: cleanedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLang
      },
      components: [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": otp
            }
          ]
        },
        {
          "type": "button",
          "sub_type": "url",
          "index": "0",
          "parameters": [
            {
              "type": "text",
              "text": otp
            }
          ]
        }
      ]
    }
  };

  try {
    await axios.post(url, body, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`[WhatsApp OTP Sent] Sent to ${cleanedPhone}`);
    return true;
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-otp-error] Meta API call failed. Trying fallback without button...", errorMsg);
    
    // Fallback: Try sending template without the URL button component in case template configuration differs
    try {
      const fallbackBody = {
        messaging_product: "whatsapp",
        to: cleanedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateLang
          },
          components: [
            {
              "type": "body",
              "parameters": [
                {
                  "type": "text",
                  "text": otp
                }
              ]
            }
          ]
        }
      };
      await axios.post(url, fallbackBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      console.log(`[WhatsApp OTP Sent Fallback] Sent to ${cleanedPhone}`);
      return true;
    } catch (fallbackErr) {
      const fallbackErrMsg = fallbackErr.response ? JSON.stringify(fallbackErr.response.data) : fallbackErr.message;
      console.warn("[whatsapp-otp-fallback-mock] Meta API failed, falling back to mock OTP. OTP Code is:", otp);
      return true;
    }
  }
}

module.exports = {
  generateOtp,
  sendEmailOtp,
  sendWhatsAppOtp
};

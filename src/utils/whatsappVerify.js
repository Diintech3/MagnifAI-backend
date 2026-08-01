const axios = require("axios");
const { env } = require("../config/env");

/**
 * Formats phone numbers to international standard format for Meta WhatsApp API.
 * e.g., "+91 84889-98877" -> "918488998877"
 * If it has 10 digits, prepends "91" (default India country code).
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

/**
 * Verifies a list of phone numbers against the Meta WhatsApp Cloud API.
 * @param {string[]} phoneNumbers - Array of phone numbers to verify.
 * @returns {Promise<Object>} Object mapping input phone numbers to boolean validity status.
 */
async function verifyWhatsAppNumbers(phoneNumbers) {
  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return {};
  }

  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    console.warn("[whatsapp-verify] Meta WhatsApp credentials are not configured in environment.");
    return {};
  }

  // Map cleaned numbers to original inputs
  const verificationMap = {};
  const cleanedNumbers = [];

  phoneNumbers.forEach(original => {
    const cleaned = formatPhoneNumber(original);
    if (cleaned) {
      verificationMap[cleaned] = original;
      cleanedNumbers.push("+" + cleaned); // Meta accepts with leading '+'
    }
  });

  if (cleanedNumbers.length === 0) return {};

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/contacts`;
    const response = await axios.post(
      url,
      {
        blocking: "wait",
        contacts: cleanedNumbers,
        force_check: true
      },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const results = {};
    // Pre-initialize all input numbers as false
    phoneNumbers.forEach(num => {
      results[num] = false;
    });

    const data = response.data;
    if (data && Array.isArray(data.contacts)) {
      data.contacts.forEach(contact => {
        // Meta returns input with or without + depending on input, clean it to match map
        const cleanedWaId = String(contact.wa_id || "").replace(/[^\d]/g, "");
        const originalInput = verificationMap[cleanedWaId];
        
        if (originalInput) {
          results[originalInput] = contact.status === "valid";
        } else {
          // Fallback matching by cleaning input field in response
          const responseInputCleaned = String(contact.input || "").replace(/[^\d]/g, "");
          const fallbackInput = verificationMap[responseInputCleaned];
          if (fallbackInput) {
            results[fallbackInput] = contact.status === "valid";
          }
        }
      });
    }

    return results;
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[whatsapp-verify-error] Meta API call failed:", errorMsg);
    throw new Error(`WhatsApp verification failed: ${err.message}`);
  }
}

module.exports = {
  verifyWhatsAppNumbers,
  formatPhoneNumber
};

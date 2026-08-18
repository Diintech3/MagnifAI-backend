const axios = require('axios');

async function testAll() {
  console.log('Testing AppPortal WhatsApp Routes Integration...');
  const baseUrl = 'http://localhost:4000'; // backend port
  
  // Test if appPortal routes load without syntax error
  try {
    const appPortal = require('../src/routes/appPortal');
    console.log('appPortal.js module loaded successfully! No syntax errors.');
  } catch (e) {
    console.error('Error loading appPortal.js:', e);
  }
}

testAll();

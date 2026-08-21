const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { listSubUsers } = require('../src/services/agentAiService');

async function inspectSubUsers() {
  try {
    const data = await listSubUsers();
    console.log('=== SUB USERS FROM RAG SERVER ===');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to fetch sub-users:', err.message);
  }
}

inspectSubUsers();

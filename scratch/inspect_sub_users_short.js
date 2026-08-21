const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { listSubUsers } = require('../src/services/agentAiService');

async function test() {
  const data = await listSubUsers();
  console.log('EMAILS IN RAG SERVER:');
  data.users.forEach(u => console.log(' -', u.email));
}
test();

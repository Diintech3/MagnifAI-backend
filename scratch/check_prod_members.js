const axios = require("axios");

const prodUrl = "https://magnifaiapi.diintech.com";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTY1ZGY3NmJhOTkxNDg5M2EzNTUwOGYiLCJhcHBJZCI6IjZhMWFiMGVhMmFmMzI5ZmY4NzMyZGUwYiIsImVtYWlsIjoic2luZ2hsYWtzaG1pcmFqQGdtYWlsLmNvbSIsInJvbGUiOiJDRU8iLCJuYW1lIjoiTGFrc2hhbWkgUmFqIFNpbmdoIiwiaWF0IjoxNzg3MTIzNTM4LCJleHAiOjE3ODcxNTIzMzh9.hyz46Cq6v3DWQRYQr1UKwbkRoSrlrTifly2CD9x6tKg";

async function checkProd() {
  const akkashGroupId = "6a82d07424d0dbb08e022ac7";
  try {
    const res = await axios.get(`${prodUrl}/api/app/whatsapp/groups/${akkashGroupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Production Response members count:", res.data.members.length);
    console.log("Production Members:", res.data.members.map(m => `${m.name} (${m.source})`));
  } catch (e) {
    console.log("Prod Err:", e.response?.data || e.message);
  }
}

checkProd().catch(console.error);

/** Election body types shown as tabs in Admin → Election */
const ELECTION_BODY_TYPES = [
  {
    id: "VIDHAN_SABHA",
    label: "Vidhan Sabha",
    labelHi: "विधान सभा",
    role: "MLA",
    defaultYear: 2022,
    years: [2012, 2017, 2022],
    seatLabel: "AC",
    description: "State assembly constituencies (Bidhan Sabha)",
    hasMap: true,
  },
  {
    id: "LOK_SABHA",
    label: "Lok Sabha",
    labelHi: "लोक सभा",
    role: "MP",
    defaultYear: 2019,
    years: [2019],
    seatLabel: "PC",
    description: "Parliamentary constituencies — last general election 2019",
    hasMap: false,
  },
  {
    id: "MLC",
    label: "Vidhan Parishad",
    labelHi: "विधान परिषद",
    role: "MLC",
    defaultYear: 2022,
    years: [2022],
    seatLabel: "LC",
    description: "Legislative Council — local authorities biennial election 2022",
    hasMap: false,
  },
  {
    id: "MUNICIPAL",
    label: "Municipality",
    labelHi: "नगर निगम / निकाय",
    role: "Mayor / Corporator",
    defaultYear: 2023,
    years: [2023],
    seatLabel: "Body",
    description: "Urban local bodies — Nagar Nigam / municipal corporations 2023",
    hasMap: false,
  },
];

function getBodyType(id) {
  return ELECTION_BODY_TYPES.find((b) => b.id === String(id || "").toUpperCase()) || null;
}

module.exports = { ELECTION_BODY_TYPES, getBodyType };

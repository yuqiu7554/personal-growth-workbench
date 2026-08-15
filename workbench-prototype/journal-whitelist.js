(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchJournalWhitelist = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const entries = [
  {
    "title": "Academy of Management Journal",
    "issn": "1948-0989",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Academy of Management Review",
    "issn": "0363-7425",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Administrative Science Quarterly",
    "issn": "0001-8392",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Entrepreneurship Theory and Practice",
    "issn": "1042-2587",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Information Systems Research",
    "issn": "1526-5536",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Journal of Business Venturing",
    "issn": "0883-9026",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Journal of Management",
    "issn": "1557-1211",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Journal of Management Information Systems",
    "issn": "1557-928X",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Journal of Management Studies",
    "issn": "0022-2380",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Journal of Operations Management",
    "issn": "0272-6963",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Journal of Public Administration Research and Theory",
    "issn": "1053-1858",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Journal of the Association for Information Systems",
    "issn": "1536-9323",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Management Science",
    "issn": "1526-5501",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "MIS Quarterly",
    "issn": "0276-7783",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Operations Research",
    "issn": "0030-364X",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Production and Operations Management",
    "issn": "1059-1478",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Public Administration",
    "issn": "0033-3298",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Public Administration Review",
    "issn": "1540-6210",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Research Policy",
    "issn": "0048-7333",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Strategic Entrepreneurship Journal",
    "issn": "1932-4391",
    "fms": "A",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4"
  },
  {
    "title": "Strategic Management Journal",
    "issn": "0143-2095",
    "fms": "A",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 4*"
  },
  {
    "title": "Academy of Management Annals",
    "issn": "1941-6067",
    "fms": "B",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4*"
  },
  {
    "title": "Global Strategy Journal",
    "issn": "2042-5791",
    "fms": "B",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4"
  },
  {
    "title": "Information Systems Journal",
    "issn": "1365-2575",
    "fms": "B",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4"
  },
  {
    "title": "International Journal of Operations & Production Management",
    "issn": "1758-6593",
    "fms": "B",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4"
  },
  {
    "title": "Journal of Strategic Information Systems",
    "issn": "1873-1198",
    "fms": "B",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4"
  },
  {
    "title": "Journal of Supply Chain Management",
    "issn": "1745-493X",
    "fms": "B",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 4"
  },
  {
    "title": "Human Relations",
    "issn": "1741-282X",
    "fms": "",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；ABS 4"
  },
  {
    "title": "Journal of Service Research",
    "issn": "1552-7379",
    "fms": "",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；ABS 4"
  },
  {
    "title": "Leadership Quarterly",
    "issn": "1873-3409",
    "fms": "",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；ABS 4"
  },
  {
    "title": "Organization Science",
    "issn": "1047-7039",
    "fms": "",
    "abs": "4*",
    "sourceZone": "1区",
    "evidence": "1区；ABS 4*"
  },
  {
    "title": "Organization Studies",
    "issn": "1741-3044",
    "fms": "",
    "abs": "4",
    "sourceZone": "1区",
    "evidence": "1区；ABS 4"
  },
  {
    "title": "Manufacturing & Service Operations Management",
    "issn": "1523-4614",
    "fms": "A",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS A；ABS 3"
  },
  {
    "title": "Decision Support Systems",
    "issn": "0167-9236",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Government Information Quarterly",
    "issn": "0740-624X",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Harvard Business Review",
    "issn": "0017-8012",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Information & Management",
    "issn": "1872-7530",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "International Journal of Management Reviews",
    "issn": "1468-2370",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Internet Research",
    "issn": "1066-2243",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Journal of Business Research",
    "issn": "0148-2963",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Journal of Small Business Management",
    "issn": "1540-627X",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "MIT Sloan Management Review",
    "issn": "1532-8937",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Omega",
    "issn": "0305-0483",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Technovation",
    "issn": "0166-4972",
    "fms": "B",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 3"
  },
  {
    "title": "Technological Forecasting and Social Change",
    "issn": "1873-5509",
    "fms": "C",
    "abs": "3",
    "sourceZone": "1区",
    "evidence": "1区；FMS C；ABS 3"
  },
  {
    "title": "International Journal of Information Management",
    "issn": "1873-4707",
    "fms": "B",
    "abs": "2",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 2"
  },
  {
    "title": "International Journal of Physical Distribution & Logistics Management",
    "issn": "1758-664X",
    "fms": "B",
    "abs": "2",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 2"
  },
  {
    "title": "International Journal of Project Management",
    "issn": "0263-7863",
    "fms": "B",
    "abs": "2",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 2"
  },
  {
    "title": "Journal of Knowledge Management",
    "issn": "1367-3270",
    "fms": "B",
    "abs": "2",
    "sourceZone": "1区",
    "evidence": "1区；FMS B；ABS 2"
  },
  {
    "title": "Journal of International Business Studies",
    "issn": "1478-6990",
    "fms": "A",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；FMS A"
  },
  {
    "title": "Journal of World Business",
    "issn": "1090-9516",
    "fms": "A",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；FMS A"
  },
  {
    "title": "Business Strategy and the Environment",
    "issn": "0964-4733",
    "fms": "B",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；FMS B"
  },
  {
    "title": "International Business Review",
    "issn": "1873-6149",
    "fms": "B",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；FMS B"
  },
  {
    "title": "Academy of Management Learning & Education",
    "issn": "1537-260X",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "ACCOUNTING ORGANIZATIONS AND SOCIETY",
    "issn": "0361-3682",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "ACCOUNTING REVIEW",
    "issn": "0001-4826",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "Annual Review of Organizational Psychology and Organizational Behavior",
    "issn": "2327-0608",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "CONTEMPORARY ACCOUNTING RESEARCH",
    "issn": "1911-3846",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "HUMAN RESOURCE MANAGEMENT",
    "issn": "1099-050X",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "Human Resource Management Journal",
    "issn": "1748-8583",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "HUMAN RESOURCE MANAGEMENT REVIEW",
    "issn": "1873-7889",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF ACCOUNTING & ECONOMICS",
    "issn": "0165-4101",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF ACCOUNTING RESEARCH",
    "issn": "1475-679X",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF CONSUMER PSYCHOLOGY",
    "issn": "1057-7408",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF CONSUMER RESEARCH",
    "issn": "0093-5301",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF MARKETING",
    "issn": "1547-7185",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF MARKETING RESEARCH",
    "issn": "0022-2437",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF ORGANIZATIONAL BEHAVIOR",
    "issn": "0894-3796",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "JOURNAL OF RETAILING",
    "issn": "1873-3271",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "MARKETING SCIENCE",
    "issn": "1526-548X",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "ORGANIZATIONAL BEHAVIOR AND HUMAN DECISION PROCESSES",
    "issn": "1095-9920",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  },
  {
    "title": "REVIEW OF ACCOUNTING STUDIES",
    "issn": "1573-7136",
    "fms": "",
    "abs": "",
    "sourceZone": "1区",
    "evidence": "1区；顶级期刊白名单"
  }
];
  const normalizeIssn = value => { const raw = String(value || '').toUpperCase().replace(/[^0-9X]/g, ''); return raw.length === 8 ? raw.slice(0, 4) + '-' + raw.slice(4) : ''; };
  const normalizeTitle = value => String(value || '').normalize('NFKD').toLowerCase().replace(/&/g, ' and ').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const byIssn = new Map(entries.map(entry => [normalizeIssn(entry.issn), entry]));
  const byTitle = new Map(entries.map(entry => [normalizeTitle(entry.title), entry]));
  const systemBlocked = value => /(^|[^a-z])ieee([^a-z]|$)/i.test(String(value || '')) || /mdpi/i.test(String(value || ''));
  function matchSource(source) {
    const issns = [source?.issn_l, ...(Array.isArray(source?.issn) ? source.issn : [])].map(normalizeIssn).filter(Boolean);
    for (const issn of issns) if (byIssn.has(issn)) return { entry: byIssn.get(issn), matchedBy: 'ISSN', matchedIssn: issn };
    const title = normalizeTitle(source?.display_name);
    return byTitle.has(title) ? { entry: byTitle.get(title), matchedBy: '标准化刊名', matchedIssn: '' } : null;
  }
  function qualify(source, customExclusions = []) {
    const title = String(source?.display_name || '');
    if (systemBlocked(title)) return { ok: false, reason: /ieee/i.test(title) ? 'IEEE系统硬排除' : 'MDPI系统硬排除' };
    const normalized = normalizeTitle(title);
    if (customExclusions.some(term => normalized.includes(normalizeTitle(term)))) return { ok: false, reason: '用户黑名单' };
    const match = matchSource(source);
    return match ? { ok: true, ...match, status: '严格白名单匹配' } : { ok: false, reason: '未匹配严格白名单' };
  }
  return { version: '2026-08-14', counts: { original: 522, retained: 72, excluded: 450 }, entries, normalizeIssn, normalizeTitle, systemBlocked, matchSource, qualify };
});

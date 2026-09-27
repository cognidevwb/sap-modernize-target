'use strict';
function reject(status, message) { const error = new Error(message); error.statusCode = status; throw error; }
function requireRole(user, role) { if (!user?.is(role)) reject(403, `Role ${role} required`); }
function requireCompany(user, code) { const assigned = user?.attr?.companyCode; const allowed = Array.isArray(assigned) ? assigned.includes(code) : assigned === code; if (!code || !allowed) reject(403, 'Company access denied'); }
module.exports = { reject, requireRole, requireCompany };

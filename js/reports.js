const STATUS_COLORS = {
    "open": "#4dabf7", "se-wip": "#ffc078", "l1-wip": "#9775fa",
    "l2": "#9775fa", "l3": "#51cf66", "l3-wip": "#51cf66",
    "tm to assign": "#ffa8cc", "need info": "#ffd43b",
    "need info from client": "#ffd43b", "client to validate": "#51cf66",
    "client to validate & close": "#51cf66", "resolved": "#868e96",
    "closed": "#868e96", "done": "#868e96", "completed": "#868e96",
};

const SEVERITY_COLORS = {
    "blocker": "#ff6b6b", "critical": "#ff8c00", "high": "#ff6347",
    "medium": "#ffa94d", "low": "#69db7c", "info": "#868e96",
};

const ENV_COLORS = {
    "STG": "#da77f2", "stg": "#da77f2", "staging": "#da77f2",
    "live": "#40c057", "production": "#40c057", "prod": "#40c057", "TBD": "#868e96",
};

const ISSUE_COLORS = {
    "Bug": "#ff6b6b", "Feature": "#4dabf7", "Enhancement": "#69db7c",
    "Documentation": "#ffd43b", "Hotfix": "#ff8c00", "Other": "#868e96",
};

const PRESETS = {
    "default": "[Sn]. [ID] | [Title] | [Issue Type] | [Status] | [Env] | [ETA]",
    "simple": "[Sn]. [ID] - [Title] - [Status]",
    "detailed": "[Sn]. [ID] | [Title] | [Severity] | [Status] | [Owner] | [Env] | [ETA] | [Issue Type]",
    "title_only": "[Sn]. [ID] | [Title]",
};

function getColor(type, value) {
    const colors = { status: STATUS_COLORS, severity: SEVERITY_COLORS, env: ENV_COLORS, issue: ISSUE_COLORS }[type] || {};
    const vl = (value || '').toLowerCase();
    for (const [k, v] of Object.entries(colors)) { if (vl.includes(k)) return v; }
    return '#e9ecef';
}

function getTicketField(ticket, key) {
    const mapping = {
        'Title': () => (ticket.title || '').trim().replace(/^"|"$/g, ''),
        'Status': () => (ticket.status || '').trim(),
        'Issue Type': () => (ticket.issue_type || '').trim(),
        'Severity': () => (ticket.severity || '').trim(),
        'Owner': () => (ticket.owner || '').trim(),
        'Environment': () => (ticket.environment || '').trim(),
        'Env': () => (ticket.environment || '').trim(),
        'ETA': () => (ticket.eta || '').trim(),
        'Project': () => (ticket.project || '').trim(),
    };
    return mapping[key] ? mapping[key]() : ((ticket[key] || ticket[key.toLowerCase()] || '') || '').trim();
}

function buildBullet(ticket, sn, fmt) {
    const id = ticket.id || '';
    const mapping = {
        "Sn": sn, "#": sn, "ID": id,
        "Title": getTicketField(ticket, 'Title'),
        "Status": getTicketField(ticket, 'Status'),
        "Issue Type": getTicketField(ticket, 'Issue Type'),
        "Severity": getTicketField(ticket, 'Severity'),
        "Owner": getTicketField(ticket, 'Owner'),
        "Environment": getTicketField(ticket, 'Environment'),
        "Env": getTicketField(ticket, 'Env'),
        "ETA": getTicketField(ticket, 'ETA'),
        "Project": getTicketField(ticket, 'Project'),
    };
    let result = fmt;
    for (const [k, v] of Object.entries(mapping)) {
        result = result.replace(new RegExp(`\\[${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'), v);
    }
    return result;
}

function buildHtmlBullet(ticket, sn, fmt) {
    const id = ticket.id || '';
    const title = getTicketField(ticket, 'Title');
    const status = getTicketField(ticket, 'Status');
    const sev = getTicketField(ticket, 'Severity').toLowerCase();
    const env = getTicketField(ticket, 'Environment');
    const issueType = getTicketField(ticket, 'Issue Type');
    const owner = getTicketField(ticket, 'Owner');
    const eta = getTicketField(ticket, 'ETA');
    const project = getTicketField(ticket, 'Project');

    const parts = fmt.split('|');
    const htmlParts = parts.map((partTemplate, j) => {
        let rendered = partTemplate.trim();
        for (const [k, v] of {
            "Sn": sn, "#": sn, "ID": id,
            "Title": title, "Status": status, "Environment": env,
            "Env": env, "ETA": eta, "Issue Type": issueType,
            "Severity": getTicketField(ticket, 'Severity'),
            "Owner": owner, "Project": project,
        }.entries()) {
            rendered = rendered.replace(new RegExp(`\\[${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'), v);
        }

        let color = '#e9ecef';
        if (j === 1 && id) color = '#da77f2';
        else if (j === 2 && title) color = getColor('issue', issueType) || '#e9ecef';
        else if (j === 2 && !title && status) color = getColor('status', status);
        else if (j === 3 && status) color = getColor('status', status);
        else if (j === 4 && env) color = getColor('env', env);
        else if (j === 5 && env) color = getColor('env', env);

        return `<span style="color:${color}">${rendered}</span>`;
    });

    return htmlParts.join(' | ');
}

function generateHtmlReport(tickets, fmt, titleText = "Ticket Status Report") {
    const ticketRows = tickets.map((t, i) => {
        const id = t.id || '';
        const title = getTicketField(t, 'Title');
        const status = getTicketField(t, 'Status');
        const sev = getTicketField(t, 'Severity').toLowerCase();
        const env = getTicketField(t, 'Environment');
        const issueType = getTicketField(t, 'Issue Type');
        const owner = getTicketField(t, 'Owner');
        const eta = getTicketField(t, 'ETA');

        return `<div class="ticket-row">
  <span class="sn">${i + 1}</span>
  <span class="id" style="color:#da77f2">${id}</span>
  <span class="title">${title}</span>
  <span class="issue-type" style="color:${getColor('issue', issueType)}">${issueType}</span>
  <span class="status" style="color:${getColor('status', status)}">${status}</span>
  <span class="env" style="color:${getColor('env', env)}">${env}</span>
  <span class="eta" style="color:${getColor('env', env)}">${eta}</span>
  <span class="severity" style="color:${getColor('severity', sev)}">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
  <span class="owner">${owner}</span>
</div>`;
    }).join('\n');

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${titleText}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e9ecef;font-family:'Segoe UI',Arial,sans-serif;padding:40px}
h1{color:#da77f2;font-size:28px;margin-bottom:8px;font-weight:600;letter-spacing:-0.5px}
.subtitle{color:#868e96;font-size:14px;margin-bottom:30px}
.ticket-row{display:flex;gap:0;padding:8px 0;border-bottom:1px solid #1a1a2e;font-size:14px;align-items:center}
.ticket-row:hover{background:#111827}
.ticket-row:first-of-type{border-top:2px solid #da77f2;border-bottom:2px solid #da77f2;padding:10px 0;font-weight:600;color:#868e96;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
.sn{width:40px;color:#495057;flex-shrink:0}
.id{width:160px;flex-shrink:0;font-family:Consolas,'Courier New',monospace;font-size:13px}
.title{flex:2;min-width:200px;color:#e9ecef}
.issue-type{width:130px;flex-shrink:0;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
.status{width:180px;flex-shrink:0;font-weight:500;font-size:13px}
.env{width:60px;flex-shrink:0;font-weight:600;font-size:12px;text-align:center}
.eta{width:60px;flex-shrink:0;font-size:12px;text-align:center}
.severity{width:90px;flex-shrink:0;font-size:12px}
.owner{width:140px;color:#adb5bd;font-size:13px}
.footer{margin-top:30px;color:#495057;font-size:12px;text-align:center}
</style>
</head>
<body>
<h1>${titleText}</h1>
<div class="subtitle">Generated: ${now}</div>
<div class="ticket-row">
  <span class="sn">#</span>
  <span class="id">Ticket ID</span>
  <span class="title">Title</span>
  <span class="issue-type">Issue Type</span>
  <span class="status">Status</span>
  <span class="env">Env</span>
  <span class="eta">ETA</span>
  <span class="severity">Severity</span>
  <span class="owner">Owner</span>
</div>
${ticketRows}
<div class="footer">Ticket Status Report &bull; Total: ${tickets.length} tickets</div>
</body>
</html>`;
}

function generatePlainReport(tickets, fmt) {
    return tickets.map((t, i) => buildBullet(t, i + 1, fmt)).join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadHtmlReport(tickets, fmt, title) {
    const html = generateHtmlReport(tickets, fmt, title);
    downloadFile(html, 'ticket_report.html', 'text/html');
}

function downloadPlainReport(tickets, fmt) {
    const text = generatePlainReport(tickets, fmt);
    downloadFile(text, 'ticket_report.txt', 'text/plain');
}

window.REPORTS = {
    STATUS_COLORS, SEVERITY_COLORS, ENV_COLORS, ISSUE_COLORS,
    PRESETS, getColor, getTicketField, buildBullet, buildHtmlBullet,
    generateHtmlReport, generatePlainReport, downloadFile,
    downloadHtmlReport, downloadPlainReport
};
async function processRawDataOld(db) {
    const text = document.getElementById('rawDataInput')?.value;
    if (!text) { showToast('Paste some data first'); return; }

    const ticketIds = [...new Set(text.match(/[A-Z]+-\d+/gi) || [])];
    if (!ticketIds.length) { showToast('No ticket IDs found'); return; }

    let updated = 0, found = 0;

    for (const tid of ticketIds) {
        const ticketId = tid.toUpperCase();
        if (!db[ticketId]) continue;
        found++;

        let updates = {};

        const statusMatch = text.match(new RegExp(ticketId + '\\s+(open|se-wip|l1-wip|l2|l3|l3-wip|resolved|closed|need info|done)', 'i'));
        if (statusMatch) updates.status = statusMatch[1];

        const envMatch = text.match(new RegExp(ticketId + '\\s+(STG|stg|staging|prod|live|production|TBD)', 'i'));
        if (envMatch) {
            updates.environment = envMatch[1].toUpperCase().replace('STAGING', 'STG').replace('PRODUCTION', 'PROD').replace('LIVE', 'PROD');
        }

        const etaMatch = text.match(new RegExp(ticketId + '\\s+(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})', 'i'));
        if (etaMatch) updates.eta = etaMatch[1];

        const issueMatch = text.match(new RegExp(ticketId + '\\s+(bug|feature|enhancement|hotfix|documentation)', 'i'));
        if (issueMatch) updates.issue_type = issueMatch[1].charAt(0).toUpperCase() + issueMatch[1].slice(1);

        if (Object.keys(updates).length) {
            await window.DB.upsertTicket(ticketId, updates);
            updated++;
        }
    }

    document.getElementById('rawPasteResults').innerHTML = `Found ${found} tickets, updated ${updated}`;
    showToast(`Found ${found} tickets, updated ${updated}`);
    if (updated > 0) setTimeout(() => location.reload(), 1500);
}

async function processRawDataNew() {
    const text = document.getElementById('rawDataInputNew')?.value;
    if (!text) { showToast('Paste some data first'); return; }

    const allColumns = ['Title', 'Status', 'Issue Type', 'Environment', 'ETA', 'Severity', 'Owner', 'Project'];
    const columnMappings = {};

    for (const col of allColumns) {
        const cb = document.getElementById('map_cb_' + col.replace(/ /g, '_'));
        const pat = document.getElementById('map_pat_' + col.replace(/ /g, '_'));
        if (cb?.checked && pat?.value.trim()) {
            columnMappings[col] = pat.value.trim();
        }
    }

    if (Object.keys(columnMappings).length === 0) {
        showToast('Select at least one column mapping');
        return;
    }

    const ticketIds = [...new Set(text.match(/[A-Z]+-\d+/gi) || [])].map(t => t.toUpperCase());
    const textLower = text.toLowerCase();
    let updated = 0, found = 0;

    for (const tid of ticketIds) {
        const ticket = window.db[tid];
        if (!ticket) continue;
        found++;

        const updates = {};
        for (const [colName, pattern] of Object.entries(columnMappings)) {
            try {
                const re = new RegExp(pattern, 'i');
                const match = re.exec(textLower);
                if (match) {
                    const val = (match[1] || match[0]).trim();
                    const dbKey = colName.toLowerCase().replace(/ /g, '_');
                    updates[dbKey] = val;
                }
            } catch (e) { }
        }

        if (Object.keys(updates).length) {
            await window.DB.upsertTicket(tid, updates);
            updated++;
        }
    }

    document.getElementById('rawPasteResultsNew').innerHTML =
        `Found ${found} tickets, updated ${updated}${updated > 0 ? '<br>Reloading...' : ''}`;
    showToast(`Found ${found}, updated ${updated}`);
    if (updated > 0) setTimeout(() => location.reload(), 1500);
}

function renderRawPasteView(container, db) {
    const allColumns = ['Title', 'Status', 'Issue Type', 'Environment', 'ETA', 'Severity', 'Owner', 'Project'];
    container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-4">
            <div class="bg-[#111827] rounded-lg p-4">
                <h3 class="text-sm font-semibold mb-3"><i class="fas fa-paste mr-2"></i>Raw Data Paste</h3>
                <div class="flex gap-2 mb-4">
                    <button class="tab-btn active" id="rawModeOld" onclick="switchRawMode('old')">Old Method</button>
                    <button class="tab-btn" id="rawModeNew" onclick="switchRawMode('new')">New Method</button>
                </div>
                <div id="rawOldMode">
                    <p class="text-xs text-[#868e96] mb-3">Paste text containing ticket IDs and field values. Each ticket will be found and updated.</p>
                    <textarea id="rawDataInput" class="input w-full h-64 font-mono text-xs" placeholder="Example:&#10;WOTASD-123 open STG&#10;PROJ-45 resolved prod 12/25&#10;BUG-789 l2 staging"></textarea>
                    <button class="btn btn-primary w-full mt-3" onclick="processRawDataOld(window.db)"><i class="fas fa-bolt mr-2"></i>Process & Update</button>
                    <div id="rawPasteResults" class="text-xs text-[#868e96] mt-2"></div>
                </div>
                <div id="rawNewMode" style="display:none">
                    <p class="text-xs text-[#868e96] mb-3">Specify which column to update using regex patterns. Use capturing groups () to extract the value.</p>
                    <div class="mb-3">
                        <label class="block text-xs text-[#868e96] mb-1">Paste your data here</label>
                        <textarea id="rawDataInputNew" class="input w-full h-64 font-mono text-xs" placeholder="Paste text with ticket IDs and field data..."></textarea>
                    </div>
                    <div class="space-y-2 mb-3">
                        ${allColumns.map(col => `
                            <div class="flex gap-2 items-center bg-[#1a1a2e] p-2 rounded">
                                <input type="checkbox" id="map_cb_${col.replace(/ /g, '_')}" class="accent-[#da77f2]">
                                <label class="text-xs font-medium w-28" for="map_cb_${col.replace(/ /g, '_')}">${col}</label>
                                <input type="text" id="map_pat_${col.replace(/ /g, '_')}" class="input text-xs flex-1 font-mono" placeholder="Regex e.g. (open|resolved)">
                                <span class="text-[10px] text-[#868e96] hidden md:inline">() = value</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex gap-2 mb-2">
                        <button class="btn btn-secondary btn-sm" onclick="loadPresetMappings()"><i class="fas fa-magic mr-1"></i>Load Preset</button>
                    </div>
                    <button class="btn btn-primary w-full" onclick="processRawDataNew()"><i class="fas fa-bolt mr-2"></i>Process & Update</button>
                    <div id="rawPasteResultsNew" class="text-xs text-[#868e96] mt-2"></div>
                </div>
            </div>
        </div>
    `;
}

function switchRawMode(mode) {
    document.getElementById('rawOldMode').style.display = mode === 'old' ? 'block' : 'none';
    document.getElementById('rawNewMode').style.display = mode === 'new' ? 'block' : 'none';
    document.getElementById('rawModeOld').classList.toggle('active', mode === 'old');
    document.getElementById('rawModeNew').classList.toggle('active', mode === 'new');
}

function loadPresetMappings() {
    const mappings = {
        Status: '(open|se-wip|l1-wip|l2|l3|l3-wip|resolved|closed|need info|done)',
        Environment: '(STG|stg|staging|prod|live|production|TBD)',
        ETA: '(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
        'Issue Type': '(bug|feature|enhancement|hotfix|documentation)',
        Severity: '(blocker|critical|high|medium|low|info)'
    };
    for (const [col, pattern] of Object.entries(mappings)) {
        const cb = document.getElementById('map_cb_' + col.replace(/ /g, '_'));
        const pat = document.getElementById('map_pat_' + col.replace(/ /g, '_'));
        if (cb) cb.checked = true;
        if (pat) pat.value = pattern;
    }
}

window.RAQDATA = { processRawDataOld, processRawDataNew, renderRawPasteView, switchRawMode, loadPresetMappings };
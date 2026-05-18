const IMPORT_FIELDS = ['Title', 'Status', 'Issue Type', 'Environment', 'ETA', 'Severity', 'Owner'];
const IMPORT_FIELD_KEYS = IMPORT_FIELDS.map(f => f.toLowerCase().replace(/ /g, '_'));

function renderImportView(container, db) {
    container.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4" id="importContainer">
            <div class="bg-[#111827] rounded-lg p-4" id="importUploadPhase">
                <h3 class="text-sm font-semibold mb-3"><i class="fas fa-file-import mr-2"></i>Import from File</h3>
                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-xs text-[#868e96] mb-1">Project Name</label>
                            <input type="text" id="importProject" class="input w-full" placeholder="default" value="${window.currentProjectFilter !== 'all' ? window.currentProjectFilter : ''}">
                        </div>
                        <div><label class="block text-xs text-[#868e96] mb-1">Environment</label>
                            <select id="importEnv" class="input w-full">
                                <option value="">Auto-detect</option>
                                <option value="STG">STG</option>
                                <option value="Production">Production</option>
                                <option value="Live">Live</option>
                                <option value="Staging">Staging</option>
                                <option value="TBD">TBD</option>
                            </select>
                        </div>
                    </div>
                    <div><label class="block text-xs text-[#868e96] mb-1">CSV/Excel File</label>
                        <input type="file" id="importFile" accept=".csv,.xlsx,.xls" class="input w-full">
                    </div>
                    <button class="btn btn-primary w-full" onclick="IMPORT.preview()"><i class="fas fa-eye mr-2"></i>Preview Import</button>
                    <div id="importError" class="text-xs text-red-400 mt-2 hidden"></div>
                </div>
            </div>
            <div id="importPreviewPhase" style="display:none"></div>
        </div>
    `;
}

async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (ext === 'csv') {
            reader.onload = function(e) {
                const text = e.target.result;
                if (typeof Papa === 'undefined') {
                    reject(new Error('PapaParse not loaded'));
                    return;
                }
                const result = Papa.parse(text, { header: true, skipEmptyLines: true, trimHeaders: true });
                resolve(result.data.filter(r => Object.values(r).some(v => v)));
            };
            reader.readAsText(file);
        } else if (ext === 'xlsx' || ext === 'xls') {
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                if (typeof XLSX === 'undefined') {
                    reject(new Error('SheetJS not loaded'));
                    return;
                }
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                resolve(json);
            };
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error('Unsupported file type: ' + ext));
        }
    });
}

function mapRowToRecord(row) {
    const id = row['ID'] || row['#'] || row['Ticket ID'] || '';
    const idMatch = id.match(/[A-Z]+-\d+/i);
    const ticketId = idMatch ? idMatch[0].toUpperCase() : '';

    if (!ticketId) {
        for (const [k, v] of Object.entries(row)) {
            const match = (v || '').toString().match(/[A-Z]+-\d+/i);
            if (match) return { ticketId: match[0].toUpperCase(), data: row };
        }
        return null;
    }

    return { ticketId, data: row };
}

function normalizeFieldName(name) {
    const map = {
        'title': 'Title', 'status': 'Status', 'issue type': 'Issue Type',
        'issue_type': 'Issue Type', 'severity': 'Severity', 'owner': 'Owner',
        'environment': 'Environment', 'env': 'Environment',
        'eta': 'ETA', 'project': 'Project',
        'id': 'ID', '#': 'ID', 'ticket id': 'ID', 'ticket_id': 'ID',
    };
    const key = (name || '').toLowerCase().trim();
    return map[key] || name;
}

function normalizeImportFields(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        const norm = normalizeFieldName(k);
        const normKey = norm.toLowerCase().replace(/ /g, '_');
        const val = (v || '').toString().trim();
        if (val) out[normKey] = val;
    }
    return out;
}

function parseRowDate(val) {
    if (!val) return '';
    if (typeof val === 'number') {
        const d = new Date((val - 25569) * 86400 * 1000);
        if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    return str;
}

async function previewImport() {
    const fileInput = document.getElementById('importFile');
    const projectInput = document.getElementById('importProject');
    const envSelect = document.getElementById('importEnv');
    const errorDiv = document.getElementById('importError');

    errorDiv.classList.add('hidden');

    const file = fileInput?.files?.[0];
    if (!file) { showToast('Select a file first'); return; }

    const project = (projectInput?.value || 'default').trim();
    const batchEnv = envSelect?.value || '';

    try {
        const records = await parseFile(file);
        if (records.length === 0) { showToast('No records found in file'); return; }

        const parsed = records
            .map(r => mapRowToRecord(r))
            .filter(Boolean);

        if (parsed.length === 0) { showToast('No ticket IDs found in file'); return; }

        const db = await window.DB.loadTickets();

        const previewRows = parsed.map(entry => {
            const tid = entry.ticketId;
            const fields = normalizeImportFields(entry.data);
            const existing = db[tid] || null;
            const isNew = !existing;

            const fieldDiffs = {};
            for (const f of IMPORT_FIELD_KEYS) {
                const fileVal = fields[f] || '';
                const currVal = existing ? (existing[f] || '') : '';
                const wouldChange = fileVal && fileVal !== currVal;
                fieldDiffs[f] = {
                    current: currVal,
                    new: fileVal,
                    wouldChange: wouldChange,
                };
            }

            if (batchEnv) {
                fieldDiffs['environment'] = {
                    current: existing?.environment || '',
                    new: batchEnv,
                    wouldChange: (existing?.environment || '') !== batchEnv,
                };
            }

            return {
                ticketId: tid,
                isNew,
                existing,
                fields: fieldDiffs,
                hasChanges: Object.values(fieldDiffs).some(f => f.wouldChange),
                selected: true,
            };
        });

        renderPreview(container, { rows: previewRows, project, file });
    } catch (e) {
        errorDiv.textContent = 'Error: ' + e.message;
        errorDiv.classList.remove('hidden');
    }
}

const container = document.getElementById('mainContent');

function renderPreview(container, state) {
    const { rows, project } = state;
    const total = rows.length;
    const newTickets = rows.filter(r => r.isNew).length;
    const changed = rows.filter(r => r.hasChanges).length;
    const unchanged = total - newTickets - changed;

    const globalToggles = IMPORT_FIELD_KEYS.map(f => {
        const label = IMPORT_FIELDS[IMPORT_FIELD_KEYS.indexOf(f)] || f;
        return `<label class="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" class="global-toggle accent-[#da77f2]" data-field="${f}" checked onchange="IMPORT.toggleGlobalField('${f}', this.checked)">
            ${label}
        </label>`;
    }).join('');

    let tableRows = '';
    const seen = new Set();
    for (const row of rows) {
        if (seen.has(row.ticketId)) continue;
        seen.add(row.ticketId);

        const rowClass = row.selected ? '' : 'opacity-40';
        const statusBadge = row.isNew
            ? '<span class="badge" style="background:#51cf6620;color:#51cf66">NEW</span>'
            : row.hasChanges
                ? '<span class="badge" style="background:#ffd43b20;color:#ffd43b">CHANGED</span>'
                : '<span class="badge" style="background:#868e9620;color:#868e96">NO CHANGE</span>';

        const cells = IMPORT_FIELD_KEYS.map(f => {
            const diff = row.fields[f] || {};
            const curr = diff.current || '';
            const newVal = diff.new || '';
            const wouldChange = diff.wouldChange;
            const hasVal = !!newVal;

            let display = `<span class="text-[#868e96]">${hasVal ? newVal : '-'}</span>`;
            if (wouldChange) {
                display = `<span class="text-red-400" title="Current: ${curr}">${newVal}</span>`;
            } else if (hasVal && curr) {
                display = `<span class="text-green-400">${newVal}</span>`;
            }

            const cellId = `cell_${row.ticketId}_${f}`;
            const isEnabled = row.selected;
            return `<td>
                <label class="flex items-center gap-1 ${isEnabled ? '' : 'opacity-30'}">
                    <input type="checkbox" class="field-toggle" data-ticket="${row.ticketId}" data-field="${f}"
                        ${isEnabled && hasVal ? 'checked' : ''}
                        ${!hasVal ? 'disabled' : ''}
                        onchange="IMPORT.toggleField('${row.ticketId}', '${f}', this.checked)">
                    ${display}
                </label>
            </td>`;
        }).join('');

        tableRows += `<tr class="${rowClass}">
            <td><input type="checkbox" class="row-toggle" data-ticket="${row.ticketId}"
                ${row.selected ? 'checked' : ''}
                onchange="IMPORT.toggleRow('${row.ticketId}', this.checked)"></td>
            <td style="color:#da77f2;font-family:monospace">${row.ticketId}</td>
            <td>${statusBadge}</td>
            ${cells}
        </tr>`;
    }

    container.querySelector('#importUploadPhase').style.display = 'none';
    container.querySelector('#importPreviewPhase').innerHTML = `
        <div class="bg-[#111827] rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-semibold">Preview: ${total} tickets found</h3>
                <div class="text-xs text-[#868e96]">
                    <span class="text-green-400">${newTickets} new</span> ·
                    <span class="text-yellow-400">${changed} changed</span> ·
                    <span class="text-gray-400">${unchanged} unchanged</span>
                </div>
            </div>

            <div class="flex flex-wrap gap-3 mb-3 p-2 bg-[#1a1a2e] rounded">
                <span class="text-xs text-[#868e96] font-medium self-center">Global field toggles:</span>
                ${globalToggles}
            </div>

            <div class="overflow-x-auto max-h-96 overflow-y-auto">
                <table class="ticket-table">
                    <thead><tr>
                        <th style="width:30px"><input type="checkbox" checked onchange="IMPORT.toggleAllRows(this.checked)"></th>
                        <th style="width:130px">ID</th>
                        <th style="width:70px">Status</th>
                        ${IMPORT_FIELDS.map((f, i) => `<th style="width:${i < 2 ? 180 : 90}px">${f}</th>`).join('')}
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>

            <div class="flex gap-3 mt-4 justify-between items-center">
                <div class="flex gap-2">
                    <button class="btn btn-secondary btn-sm" onclick="IMPORT.selectAll()"><i class="fas fa-check-square mr-1"></i>All</button>
                    <button class="btn btn-secondary btn-sm" onclick="IMPORT.deselectAll()"><i class="fas fa-square mr-1"></i>None</button>
                    <button class="btn btn-secondary btn-sm" onclick="IMPORT.invertSelection()"><i class="fas fa-exchange-alt mr-1"></i>Invert</button>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary" onclick="IMPORT.cancel()"><i class="fas fa-times mr-1"></i>Cancel</button>
                    <button class="btn btn-primary" onclick="IMPORT.execute(project, '${state.file.name}')"><i class="fas fa-check mr-2"></i>Apply Import</button>
                </div>
            </div>
            <div id="importExecResult" class="mt-2"></div>
        </div>
    `;
    container.querySelector('#importPreviewPhase').style.display = 'block';

    window._previewState = { rows, file: state.file, selectedTickets: new Set(rows.filter(r => r.selected).map(r => r.ticketId)), skipFields: new Set() };
}

const IMPORT = {
    container: document.getElementById('mainContent'),

    preview: previewImport,

    toggleGlobalField(field, checked) {
        const state = window._previewState;
        if (!state) return;
        if (checked) {
            state.skipFields.delete(field);
        } else {
            state.skipFields.add(field);
        }
        document.querySelectorAll(`.field-toggle[data-field="${field}"]`).forEach(cb => {
            cb.closest('label').style.opacity = checked ? '1' : '0.3';
        });
    },

    toggleField(ticketId, field, checked) {
        const state = window._previewState;
        if (!state) return;
    },

    toggleRow(ticketId, checked) {
        const state = window._previewState;
        if (!state) return;
        const row = state.rows.find(r => r.ticketId === ticketId);
        if (row) row.selected = checked;
        const tr = document.querySelector(`input.row-toggle[data-ticket="${ticketId}"]`)?.closest('tr');
        if (tr) {
            tr.style.opacity = checked ? '1' : '0.4';
            tr.querySelectorAll('.field-toggle').forEach(cb => cb.closest('label').style.opacity = checked ? '1' : '0.3');
        }
        if (checked) state.selectedTickets.add(ticketId);
        else state.selectedTickets.delete(ticketId);
    },

    toggleAllRows(checked) {
        document.querySelectorAll('.row-toggle').forEach(cb => {
            cb.checked = checked;
            this.toggleRow(cb.dataset.ticket, checked);
        });
    },

    selectAll() { this.toggleAllRows(true); },
    deselectAll() { this.toggleAllRows(false); },

    invertSelection() {
        document.querySelectorAll('.row-toggle').forEach(cb => {
            cb.checked = !cb.checked;
            this.toggleRow(cb.dataset.ticket, cb.checked);
        });
    },

    cancel() {
        document.getElementById('importUploadPhase').style.display = 'block';
        document.getElementById('importPreviewPhase').style.display = 'none';
        window._previewState = null;
    },

    async execute(project, fileName) {
        const state = window._previewState;
        if (!state) { showToast('No preview data'); return; }

        if (state.selectedTickets.size === 0) { showToast('No tickets selected'); return; }

        const file = document.getElementById('importFile').files[0];
        const batchEnv = document.getElementById('importEnv')?.value || '';
        if (!file) { showToast('File not found'); return; }

        try {
            const records = await parseFile(file);
            const parsed = records.map(r => mapRowToRecord(r)).filter(Boolean);

            const ticketsToUpsert = [];
            for (const entry of parsed) {
                const tid = entry.ticketId;
                if (!state.selectedTickets.has(tid)) continue;

                const fields = normalizeImportFields(entry.data);

                Object.keys(fields).forEach(k => {
                    if (state.skipFields.has(k)) delete fields[k];
                });

                if (batchEnv) fields['environment'] = batchEnv;

                if (Object.keys(fields).length > 0) {
                    fields.id = tid;
                    ticketsToUpsert.push(fields);
                }
            }

            if (ticketsToUpsert.length === 0) { showToast('No data to import'); return; }

            await window.DB.upsertTickets(ticketsToUpsert);
            showToast(`Imported ${ticketsToUpsert.length} tickets`);
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('Import error: ' + e.message);
        }
    }
};

window.IMPORT = IMPORT;
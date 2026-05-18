const SUPABASE_URL = 'https://myvumtkjdkduhaiiemwd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dnVtdGpremtkdWhhaWllbXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTUwNjksImV4cCI6MjA5NDY3MTA2OX0.SjZDm4_VCBASf4QCYx58Nh_nYUBt0ivFK_8Hguf4qeU';

let sb;

const DB = {
    init() {
        if (typeof window.supabase !== 'undefined') {
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.warn('Supabase SDK not loaded yet');
        }
    },

    async getClient() {
        if (!sb) {
            const { createClient } = await import(`${SUPABASE_URL}/rest/v1/` + '..');
            if (typeof window.supabase !== 'undefined') {
                sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            }
        }
        return sb;
    },

    async loadTickets() {
        const client = await this.getClient();
        const { data, error } = await client.from('tickets').select('*');
        if (error) { console.error('loadTickets error', error); return {}; }
        const db = {};
        for (const row of (data || [])) {
            db[row.id] = row;
        }
        return db;
    },

    async upsertTicket(ticketId, data) {
        const client = await this.getClient();
        const payload = { id: ticketId, ...data, updated_at: new Date().toISOString() };
        const { error } = await client.from('tickets').upsert(payload, { onConflict: 'id' });
        if (error) { console.error('upsertTicket error', error); throw error; }
    },

    async upsertTickets(tickets) {
        if (!tickets || tickets.length === 0) return;
        const client = await this.getClient();
        const now = new Date().toISOString();
        const rows = tickets.map(t => ({ ...t, updated_at: now, created_at: now }));
        const { error } = await client.from('tickets').upsert(rows, { onConflict: 'id' });
        if (error) { console.error('upsertTickets error', error); throw error; }
    },

    async deleteTicket(ticketId) {
        const client = await this.getClient();
        const { error } = await client.from('tickets').delete().eq('id', ticketId);
        if (error) { console.error('deleteTicket error', error); }
    },

    async deleteTicketsByProject(projectId) {
        const client = await this.getClient();
        const { error } = await client.from('tickets').delete().eq('project', projectId);
        if (error) { console.error('deleteTicketsByProject error', error); }
    },

    async renameProject(oldName, newName) {
        const client = await this.getClient();
        const { data, error } = await client.from('tickets').select('id,project').eq('project', oldName);
        if (error) { console.error('renameProject error', error); return; }
        for (const t of (data || [])) {
            await client.from('tickets').update({ project: newName, updated_at: new Date().toISOString() }).eq('id', t.id);
        }
    },

    async bulkUpdateStatus(actions) {
        const client = await this.getClient();
        const now = new Date().toISOString();
        for (const [tid, action] of Object.entries(actions)) {
            if (action === 'resolve') {
                await client.from('tickets').update({ status: 'Resolved', updated_at: now }).eq('id', tid);
            } else if (action === 'remove') {
                await client.from('tickets').delete().eq('id', tid);
            }
        }
    },

    async loadSettings() {
        const client = await this.getClient();
        const { data, error } = await client.from('app_data').select('value').eq('key', '_settings').single();
        if (error && error.code !== 'PGRST116') console.error('loadSettings error', error);
        return data ? data.value : {};
    },

    async saveSettings(settings) {
        const client = await this.getClient();
        const current = await this.loadSettings();
        const merged = { ...current, ...settings };
        await client.from('app_data').upsert({ key: '_settings', value: merged }, { onConflict: 'key' });
    },

    async loadGsheetLinks() {
        const client = await this.getClient();
        const { data, error } = await client.from('app_data').select('key,value').eq('key', 'gsheet_links').single();
        if (error && error.code !== 'PGRST116') console.error('loadGsheetLinks error', error);
        return data ? data.value : {};
    },

    async saveGsheetLinks(links) {
        const client = await this.getClient();
        await client.from('app_data').upsert({ key: 'gsheet_links', value: links }, { onConflict: 'key' });
    },

    async clearAll() {
        const client = await this.getClient();
        const { error } = await client.from('tickets').delete().neq('id', '__placeholder__');
        const { error: err2 } = await client.from('tickets').delete();
        if (err2) console.error('clearAll error', err2);
    }
};

window.DB = DB;
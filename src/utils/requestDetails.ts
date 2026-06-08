// Shared helper to build a clean, shareable text summary of a parent request
// (used by the admin "Copy details" actions). Salary is computed at the gross
// hourly rate below.

export const GROSS_RATE = 13.22; // € / hour, gross

const hoursBetween = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0;
    return Math.max(0, (eh + em / 60) - (sh + sm / 60));
};

const ageFromDob = (dob?: string): number | null => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
};

const fmtDate = (d?: string | null): string => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB'); } catch { return String(d); }
};

export function buildRequestDetailsText(request: any, fr: boolean): string {
    const user = request?.user;
    const familyName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Family';
    const children = request?.children ?? [];
    const ages = children
        .map((c: any) => ageFromDob(c.child_dob))
        .filter((a: number | null) => a !== null);

    const lines: string[] = [];
    lines.push(`${fr ? 'Demande' : 'Request'} #${request?.id} — ${familyName}`);
    if (request?.parent_address) lines.push(`${fr ? 'Adresse' : 'Address'}: ${request.parent_address}`);
    lines.push(`${fr ? 'Enfants' : 'Children'}: ${children.length}${ages.length ? ` (${fr ? 'âges' : 'ages'}: ${ages.join(', ')})` : ''}`);
    lines.push('');
    lines.push(`${fr ? 'Planning' : 'Schedule'}:`);

    let totalHours = 0;
    (request?.schedules ?? []).forEach((s: any) => {
        const slots = s.slots ?? [];
        const slotStrs = slots.map((sl: any) => {
            totalHours += hoursBetween(sl.start_time, sl.end_time);
            return `${(sl.start_time || '').slice(0, 5)}-${(sl.end_time || '').slice(0, 5)}`;
        });
        lines.push(`  ${fmtDate(s.schedule_date)}: ${slotStrs.join(', ') || '—'}`);
    });

    lines.push('');
    lines.push(`${fr ? 'Total heures' : 'Total hours'}: ${totalHours.toFixed(2)}h`);
    lines.push(`${fr ? 'Salaire brut' : 'Gross salary'}: ${(totalHours * GROSS_RATE).toFixed(2)} € (13,22 €/h ${fr ? 'brut' : 'gross'})`);

    return lines.join('\n');
}

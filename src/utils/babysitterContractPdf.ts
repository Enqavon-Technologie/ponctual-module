import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Builds the babysitter CDD contract as a static HTML string (mirrors
// BabysitterContractView) and renders it to a downloadable PDF.

const fmtFr = (d?: string | null): string => {
    if (!d) return '……………………';
    try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return String(d);
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    } catch { return String(d); }
};

const navigoTier = (weekly: number): string => {
    if (weekly >= 21) return '100 %';
    if (weekly > 5) return '50 %';
    if (weekly >= 4) return '25 %';
    if (weekly >= 3) return '15 %';
    if (weekly >= 2) return '10 %';
    return '0 %';
};

const esc = (s: any): string => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

const buildBabysitterContractHtml = (data: any): string => {
    const bs = data.babysitter || {};
    const name = `${bs.first_name ?? ''} ${bs.last_name ?? ''}`.trim() || '—';
    const today = fmtFr(new Date().toISOString());
    const daysList = (data.days || [])
        .map((d: any) => `<li>${fmtFr(d.date)} : ${(d.slots || []).map((s: any) => `${esc(s.start)} - ${esc(s.end)}`).join(', ') || '—'}</li>`)
        .join('');

    const section = (title: string, body: string) =>
        `<h3 style="font-size:13px;font-weight:bold;margin:14px 0 4px;">${title}</h3><div>${body}</div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color:#1f2937; font-size:12px; line-height:1.55; margin:0; padding:40px; width:794px; }
        h1 { font-size:18px; text-align:center; margin:0; }
        .sub { text-align:center; color:#9ca3af; font-weight:bold; font-size:12px; margin:2px 0 24px; }
        p { margin:0 0 8px; }
        ul { margin:4px 0; padding-left:22px; }
        strong { color:#111827; }
        .sig { display:flex; gap:40px; margin-top:24px; }
        .sig > div { flex:1; }
        .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; font-weight:bold; }
        .mention { font-size:10px; font-style:italic; color:#9ca3af; }
        .signed { color:#71C4BE; font-style:italic; font-size:16px; margin-top:10px; }
    </style></head><body>
        <h1>CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE</h1>
        <div class="sub">C.D.D.</div>

        <p><strong>ENTRE LES SOUSSIGNÉS</strong></p>
        <p>La société <strong>Enqavon Service (Bloom Buddies Babysitting)</strong> au capital de 1000€, immatriculée 885130682 au RCS de Paris, ayant son siège social 7 rue Meyerbeer, représentée par Enqavon Incorporated Président. Code NAF/APE : 8891A. Ci-après l'« Employeur »</p>
        <p><strong>D'UNE PART,</strong></p>
        <p>Et<br><strong>${esc(name)}</strong><br>
        Né-e le ${fmtFr(bs.dob)}<br>
        Demeurant au ${esc(bs.address) || '……………………'}<br>
        Joignable au ${esc(bs.phone) || '……………………'}<br>
        Numéro de sécurité sociale : ${esc(bs.ssn) || '……………………'}<br>
        Ci-après le « Salarié »</p>
        <p><strong>D'AUTRE PART.</strong></p>

        ${section('Article 1 — Engagement', `La société Enqavon Service engage <strong>${esc(name)}</strong>, sous contrat de travail à durée déterminée à partir du <strong>${fmtFr(data.start_date)}</strong> jusqu'au <strong>${fmtFr(data.end_date)}</strong>, correspondant à la période de garde réservée par la famille. L'Employeur a déclaré préalablement à son embauche auprès de l'URSSAF de Paris.`)}
        ${section('Article 2 — Conventions applicables', `Le présent contrat est régi par la Convention collective Service à la personne IDCC n° 3127 (Brochure n° 3370). En cas de contradiction, la Convention collective prévaudra.`)}
        ${section('Article 3 — Durée et Période d\'essai', `<p><strong>3.1 — Durée.</strong> Le contrat est conclu pour la durée déterminée mentionnée à l'article 1.</p><p><strong>3.2 — Période d'essai.</strong> Quatorze (14) jours calendaires à compter du début d'exécution, conformément à l'article L1221-25 du Code du travail.</p>`)}
        ${section('Article 4 — Fonctions du salarié', `Le Salarié exercera les fonctions de garde d'enfant (non-cadre) : éveil et développement de l'enfant, et accompagnement sécurisé lors des déplacements, conformément à la Charte nationale pour l'accueil du jeune enfant.`)}
        ${section('Article 5 — Lieu de travail', `Le Salarié exerce ses fonctions chez un client au <strong>${esc(data.client_address) || '……'}</strong> et les environs d'Île-de-France.`)}
        ${section('Article 6 — Durée du travail', `<p>Durée totale de <strong>${esc(data.total_hours)} heures</strong>${data.weekly_hours ? ` (env. <strong>${esc(data.weekly_hours)} h/semaine</strong>)` : ''}, aux dates et horaires suivants :</p><ul>${daysList}</ul><p>Les horaires peuvent être modifiés à la demande du client dans le même mois (préavis de trois jours). Heures complémentaires dans la limite de 24 h/mois.</p>`)}
        ${section('Article 7 — Rémunération et primes', `<p><strong>7.1</strong> Rémunération horaire brute de <strong>${Number(data.base_rate).toFixed(2)} €/h</strong> (base) ; avec l'indemnité de congés payés de 10 %, le brut total est de <strong>${Number(data.total_rate).toFixed(2)} €/h</strong>.</p><p><strong>7.2</strong> Heures complémentaires rémunérées dans la limite légale.</p><p><strong>7.3 Transport :</strong> participation de <strong>${navigoTier(data.weekly_hours)}</strong> du forfait Navigo mensuel, sur justificatifs.</p><p><strong>7.4 Mutuelle :</strong> 50 % à la signature, 100 % au-delà de 21 h/semaine.</p>`)}
        ${section('Article 8 — Entretien professionnel', `Entretien professionnel tous les deux ans (article L6315 du Code du travail).`)}
        ${section('Article 9 — Loyauté', `Le Salarié s'engage à une totale loyauté et à ne participer à aucune activité concurrente.`)}
        ${section('Article 10 — Fin de contrat', `Préavis de deux semaines ouvrées ; à défaut, indemnité compensatrice correspondante.`)}
        ${section('Article 11 — Confidentialité', `Discrétion stricte sur les informations de la Société et de ses clients, pour deux ans après la cessation du contrat.`)}
        ${section('Article 12 — Antécédents judiciaires et FIJAISV', `Moralité irréprochable requise ; absence de condamnations au bulletin n°3 ou au FIJAISV incompatibles avec l'activité.`)}

        <p style="margin-top:20px;">Fait à Paris, le ${today}.</p>
        <div class="sig">
            <div>
                <div class="lbl">L'Employeur</div>
                <div class="mention">« Lu et approuvé »</div>
                <div class="signed">Enqavon Service</div>
            </div>
            <div>
                <div class="lbl">Le Salarié</div>
                <div class="mention">« Lu et approuvé »</div>
                ${data.signature_name ? `<div class="signed">${esc(data.signature_name)}</div>` : '<div style="margin-top:10px;color:#cbd5e1;">……………………</div>'}
            </div>
        </div>
    </body></html>`;
};

export const generateBabysitterContractPdf = async (data: any, choiceId: number): Promise<void> => {
    const html = buildBabysitterContractHtml(data);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) throw new Error('Could not access iframe document');
        doc.open();
        doc.write(html);
        doc.close();

        await new Promise(resolve => setTimeout(resolve, 400));

        const body = doc.body;
        const canvas = await html2canvas(body, {
            scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
            width: 794, windowWidth: 794, windowHeight: body.scrollHeight,
        });

        const A4_WIDTH_PX = 794;
        const A4_HEIGHT_PX = 1123;
        const SCALE = 2;

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_WIDTH_PX, A4_HEIGHT_PX] });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const pageCanvasHeight = A4_HEIGHT_PX * SCALE;
        const totalPages = Math.ceil(canvasHeight / pageCanvasHeight);

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = pageCanvasHeight;
            const ctx = pageCanvas.getContext('2d');
            if (!ctx) continue;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            const sourceY = page * pageCanvasHeight;
            const sourceHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY);
            ctx.drawImage(canvas, 0, sourceY, canvasWidth, sourceHeight, 0, 0, canvasWidth, sourceHeight);
            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`Babysitter-Contract-${choiceId}.pdf`);
    } finally {
        document.body.removeChild(iframe);
    }
};

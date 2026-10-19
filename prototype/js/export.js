/* "Eksporto të dhënat": a real .xlsx built in the browser, no libraries, works offline.
 * An .xlsx is a zip of small XML files; this writes an uncompressed (stored) zip.
 * The app will generate the same sheets on the server (spec §9). */
(function () {
  const OT = window.OT;
  const enc = new TextEncoder();

  /* ───────── Zip (stored, no compression) ───────── */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const chunks = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, dosTime, 2], [12, dosDate, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2], [28, 0, 2]]
        .forEach(([o, v, n]) => n === 4 ? local.setUint32(o, v, true) : local.setUint16(o, v, true));
      const cen = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, dosTime, 2], [14, dosDate, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
        .forEach(([o, v, n]) => n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true));
      chunks.push(new Uint8Array(local.buffer), name, data);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cenSize = central.reduce((s, c) => s + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, cenSize, 4], [16, offset, 4], [20, 0, 2]]
      .forEach(([o, v, n]) => n === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true));
    const all = [...chunks, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
    let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
    return out;
  }

  /* ───────── SpreadsheetML ───────── */
  const xml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  /** cols: [{ h: header, w: width, money?: true }], rows: arrays of values (money in cents) */
  function sheetXml({ cols, rows }) {
    const cell = (v, r, c, money) => {
      const ref = `${col(c)}${r}`;
      if (v == null || v === '') return '';
      if (money) return `<c r="${ref}" s="2"><v>${(v / 100).toFixed(2)}</v></c>`;
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    };
    const head = `<row r="1">${cols.map((c, i) => `<c r="${col(i)}1" t="inlineStr" s="1"><is><t>${xml(c.h)}</t></is></c>`).join('')}</row>`;
    const body = rows.map((row, ri) => `<row r="${ri + 2}">${row.map((v, ci) => cell(v, ri + 2, ci, cols[ci].money)).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 14}" customWidth="1"/>`).join('')}</cols>
<sheetData>${head}${body}</sheetData></worksheet>`;
  }
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;€&quot;"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  function workbook(sheets) {
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: STYLES },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }))
    ];
    return zip(files);
  }

  /* ───────── The owner's sheets: readable without the app ───────── */
  OT.exportXlsx = (S, B) => {
    const d = OT.fmtDate, cust = id => S.customers.find(c => c.id === id) || {};
    const inst = id => id ? (S.installers.find(i => i.id === id) || { name: '—' }).name : '';
    const user = id => (S.users.find(u => u.id === id) || { name: '' }).name;
    const stage = k => OT.stageLabel(k, B);
    const orders = {
      name: 'Porositë',
      cols: [{ h: 'Nr.', w: 10 }, { h: 'Klienti', w: 26 }, { h: 'Telefoni', w: 18 }, { h: 'Produkti', w: 20 }, { h: 'Përshkrimi', w: 40 }, { h: 'Qyteti', w: 12 }, { h: 'Si të shkoni', w: 50 },
        { h: 'Faza', w: 10 }, { h: 'Çmimi', w: 12, money: true }, { h: 'Paguar', w: 12, money: true }, { h: 'Për t’u paguar tani', w: 16, money: true }, { h: 'Afati', w: 12 },
        { h: 'Sasia', w: 8 }, { h: 'Montuar', w: 9 }, { h: 'Njësia', w: 8 }, { h: 'Krijuar', w: 12 }, { h: 'Kryer', w: 12 }, { h: 'Shënim i brendshëm', w: 36 }],
      rows: S.orders.map(o => {
        const c = cust(o.customerId), t = OT.orderTotals(o);
        return [o.number, c.name, OT.fmtPhone(c.phone), o.productType, o.description, o.city, o.directions, stage(o.stage), o.price, t.paid, t.owed,
          t.owed > 0 ? (t.dueDate ? d(t.dueDate) : 'Afat i panjohur') : '', o.qty || '', o.qty ? OT.installedQty(o) : '', o.unit || '', d(o.createdAt), o.doneAt ? d(o.doneAt) : '', o.notes];
      })
    };
    const payRows = [];
    for (const o of S.orders) for (const p of o.payments) payRows.push([d(p.date), o.number, cust(o.customerId).name, p.amount, OT.METHODS[p.method], p.heldBy ? `Te ${inst(p.heldBy)}` : 'Në zyrë', p.handedAt ? d(p.handedAt) : p.heldBy ? 'Pa dorëzuar' : '', user(p.by), p.note]);
    for (const ob of S.openings) for (const p of ob.payments) payRows.push([d(p.date), 'Borxh i bartur', ob.name, p.amount, OT.METHODS[p.method], p.heldBy ? `Te ${inst(p.heldBy)}` : 'Në zyrë', p.handedAt ? d(p.handedAt) : p.heldBy ? 'Pa dorëzuar' : '', user(p.by), p.note]);
    payRows.sort((a, b) => b[0].split('.').reverse().join('').localeCompare(a[0].split('.').reverse().join('')));
    const payments = {
      name: 'Pagesat',
      cols: [{ h: 'Data', w: 12 }, { h: 'Porosia', w: 14 }, { h: 'Klienti', w: 26 }, { h: 'Shuma', w: 12, money: true }, { h: 'Mënyra', w: 10 }, { h: 'Ku janë paratë', w: 16 }, { h: 'Dorëzuar më', w: 14 }, { h: 'Regjistroi', w: 12 }, { h: 'Shënim', w: 30 }],
      rows: payRows
    };
    const visits = {
      name: 'Vizitat',
      cols: [{ h: 'Data', w: 12 }, { h: 'Ora', w: 10 }, { h: 'Lloji', w: 10 }, { h: 'Porosia', w: 10 }, { h: 'Klienti', w: 26 }, { h: 'Montuesi', w: 12 }, { h: 'Qyteti', w: 12 }, { h: 'Kryer më', w: 12 }, { h: 'Sasia e montuar', w: 14 }, { h: 'Shënim', w: 34 }],
      rows: OT.allVisits().reverse().map(({ o, v }) => [d(v.date), OT.timeLabel(v.time), OT.VISIT[v.type], o.number, cust(o.customerId).name, inst(v.installerId), o.city, v.doneAt ? d(v.doneAt) : '', v.qty ? `${v.qty} ${o.unit}` : '', v.note])
    };
    const openings = {
      name: 'Borxhet e bartura',
      cols: [{ h: 'Emri', w: 24 }, { h: 'Telefoni', w: 18 }, { h: 'Shuma', w: 12, money: true }, { h: 'Paguar', w: 12, money: true }, { h: 'Mbetur', w: 12, money: true }, { h: 'Për çfarë', w: 24 }, { h: 'Kur duhej paguar', w: 16 }, { h: 'Shënim', w: 30 }],
      rows: S.openings.map(ob => { const t = OT.openingTotals(ob); return [ob.name, OT.fmtPhone(ob.phone), ob.amount, t.paid, t.owed, ob.forWhat, ob.dueDate ? (ob.dueApprox ? '≈ ' + OT.fmtMonth(ob.dueDate.slice(0, 7)) : d(ob.dueDate)) : 'Nuk e di', ob.note]; })
    };
    const clients = {
      name: 'Klientët',
      cols: [{ h: 'Emri', w: 26 }, { h: 'Telefoni', w: 18 }, { h: 'Kanali', w: 10 }, { h: 'Shteti', w: 10 }, { h: 'Mos sugjero kujtesa', w: 18 }, { h: 'Porosi', w: 8 }, { h: 'Shënim', w: 30 }],
      rows: S.customers.map(c => [c.name, OT.fmtPhone(c.phone), c.channel === 'viber' ? 'Viber' : 'WhatsApp', c.country || 'Kosovë', c.noReminders ? 'Po' : '', S.orders.filter(o => o.customerId === c.id).length, c.note])
    };
    return workbook([orders, payments, visits, openings, clients]);
  };
})();

/* Two sample brands in the brand.json v2 shape (plus prototype-only `people`
 * and `catalog`, which in the app come from users/installers and businessType seed). */
window.OT = window.OT || {};

OT.brands = {
  'druri-design': {
    schemaVersion: 2,
    slug: 'druri-design',
    companyName: 'Druri Design',
    shortName: 'Druri',
    tagline: { sq: 'Kuzhina me porosi që nga 2005' },
    logo: {
      alt: 'Druri Design',
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="#1F3A5F"/><path d="M20 16h12c9.4 0 16 6.6 16 16s-6.6 16-16 16H20z" fill="none" stroke="#C8A165" stroke-width="5" stroke-linejoin="round"/><path d="M27 25c5 1 8 4 8 7s-3 6-8 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
    },
    colors: { primary: '#1F3A5F', accent: '#C8A165', background: '#FFFFFF', text: '#1A1A1A' },
    font: 'Inter',
    contact: {
      phone: '+38344123456', whatsapp: '+38344123456', viber: '+38344123456',
      email: 'info@druridesign.example', address: 'Rr. Agim Ramadani 24, Prishtinë', city: 'Prishtinë',
      mapsUrl: 'https://maps.google.com/?q=Prishtin%C3%AB', googleReviewUrl: 'https://g.page/r/druri-design/review'
    },
    languages: ['sq'], defaultLanguage: 'sq',
    businessType: 'kitchens',
    depositWord: 'Avans',
    modules: { orderTracking: true },
    demo: true,
    people: { owner: 'Arben', office: 'Teuta', installers: [['Driton', '+38344281734'], ['Faton', '+38349660218'], ['Besnik', '+38345117390']] },
    catalog: {
      scale: 1,
      main: { type: 'Kuzhinë', descs: ['Kuzhinë në formë L, MDF mat, sipërfaqe pune kuarc', 'Kuzhinë me ishull, fronte arre', 'Kuzhinë e drejtë 3,6 m, fronte të bardha me shkëlqim', 'Kuzhinë në formë U, antracit mat'], min: 3500, max: 8500 },
      second: { type: 'Garderobë', descs: ['Garderobë me dyer rrëshqitëse, 2,4 m', 'Garderobë në kënd me pasqyrë', 'Garderobë deri në tavan, 3 m'], min: 900, max: 2400 },
      small: { type: 'Dollap banjoje', descs: ['Dollap banjoje i varur me lavaman', 'Dollap banjoje me pasqyrë dhe ndriçim'], min: 450, max: 900 },
      pickup: { type: 'Tavolinë ngrënieje', descs: ['Tavolinë lisi 180 cm + 6 karrige, nga stoku'], min: 850, max: 850 },
      delivery: { type: 'Mobilje dhome ditore', descs: ['Njësi TV + raft muri, e montuar në punëtori'], min: 700, max: 1100 },
      // A builder's order, installed in parts (spec §3 multi-unit projects)
      project: { client: 'Arbëria Invest sh.p.k.', type: 'Kuzhinë', desc: 'Kuzhina për 24 banesa · Kompleksi Arbëria, Lamela B', qty: 24, unit: 'banesa', unitPrice: 2800, batches: [[4, -80], [6, -60], [5, -41], [3, -15]], paid: [[20000, -120], [19600, -30]], next: 'Lamela B, kati 3: 4 kuzhina', short: '24 kuzhina' },
      photo: 'kitchen'
    }
  },

  'lumi-dyer': {
    schemaVersion: 2,
    slug: 'lumi-dyer',
    companyName: 'Lumi Dyer & Parket',
    shortName: 'Lumi',
    tagline: { sq: 'Dyer dhe dysheme që zgjasin' },
    logo: {
      alt: 'Lumi Dyer & Parket',
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="#2F5D50"/><path d="M20 50V24a12 12 0 0 1 24 0v26" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="38" cy="37" r="2.6" fill="#E08A3C"/><path d="M12 50h40" stroke="#E08A3C" stroke-width="4.5" stroke-linecap="round"/></svg>'
    },
    colors: { primary: '#2F5D50', accent: '#E08A3C', background: '#FFFFFF', text: '#17201D' },
    font: 'Inter',
    contact: {
      phone: '+38349555210', whatsapp: '+38349555210', viber: '+38349555210',
      email: 'info@lumidyer.example', address: 'Rr. Remzi Ademaj 8, Prizren', city: 'Prizren',
      mapsUrl: 'https://maps.google.com/?q=Prizren', googleReviewUrl: 'https://g.page/r/lumi-dyer/review'
    },
    languages: ['sq'], defaultLanguage: 'sq',
    businessType: 'doors_floors',
    depositWord: 'Kapar',
    modules: { orderTracking: true },
    demo: true,
    people: { owner: 'Burim', office: 'Vjosa', installers: [['Gentrit', '+38344390521'], ['Valon', '+38349215874'], ['Agon', '+38345703126']] },
    catalog: {
      scale: 0.5,
      main: { type: 'Dyer të brendshme', descs: ['6 dyer të brendshme, laminat i bardhë, me pragje', '5 dyer të brendshme, ngjyrë lisi', '7 dyer me xham satinato'], min: 1600, max: 3600 },
      second: { type: 'Parket laminat', descs: ['Parket laminat 8 mm, 85 m², me shtrim', 'Parket laminat AC5, 120 m², me shtrim'], min: 1400, max: 2800 },
      small: { type: 'Derë hyrëse', descs: ['Derë hyrëse e blinduar, antracit', 'Derë hyrëse me xham anësor'], min: 650, max: 1200 },
      pickup: { type: 'Derë e brendshme nga stoku', descs: ['2 dyer 80 cm nga stoku, pa montim'], min: 340, max: 340 },
      delivery: { type: 'Parket (vetëm dërgesë)', descs: ['Parket laminat 60 m², vetëm dërgesë'], min: 700, max: 1000 },
      project: { client: 'Kodra Ndërtim sh.p.k.', type: 'Dyer të brendshme', desc: '100 dyer të brendshme · Banesat Kodra e Diellit, hyrja 2', qty: 100, unit: 'copë', unitPrice: 250, batches: [[5, -75], [10, -62], [8, -50], [9, -38], [8, -20]], paid: [[5000, -90], [2500, -30]], next: 'Kati 4: 10 dyer', short: '100 dyer' },
      photo: 'door'
    }
  }
};

OT.defaultBrand = 'druri-design';

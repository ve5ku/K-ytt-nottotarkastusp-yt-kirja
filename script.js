/*
 * Käyttöönottotarkastuspöytäkirja – SCRIPT.js V5
 * Uutta V5:ssa:
 *  - Logo PDF:ään robustisti (window.companyLogo tai UI:n <img.brand-logo> → DataURL)
 *  - §14 esitäytöt: nimi "Vesa Kauppinen" + päivämäärä & aika automaattisesti, kun osio sisällytetään
 *  - "Tyhjennä"-toiminto (korvaa tallennuksen). Varmennuskysymys ennen tyhjennystä
 *  - Otsikoille lisämarginaalia PDF:ssä (ei limityksiä)
 *  - Muut V4-asiat (GPS käänteishaku, kaikki ruudut tulosteeseen) säilytetty
 */

/* global idbKeyval */
(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const form = el('poytakirja-form');
  const formContent = el('form-content');

  // Käynnistä suoraan lomake
  document.addEventListener('DOMContentLoaded', () => buildFormView());

  // Tuki sekä vanhalle (save-form-btn) että uudelle (clear-form-btn) napille
  (function bindTopButtons(){
    const clearBtn = el('clear-form-btn') || el('save-form-btn');
    if (clearBtn){
      clearBtn.textContent = 'Tyhjennä';
      clearBtn.addEventListener('click', askAndClear);
      clearBtn.id = 'clear-form-btn';
    }
    el('generate-pdf')?.addEventListener('click', () => generatePdf());
  })();

  // --- Kevyt varasto kuville ---
  let currentFormId = `${Date.now()}`;
  const IMG_KEY = () => `${currentFormId}_images`;
  const listImages = async () => (await idbKeyval.get(IMG_KEY())) || [];
  const saveImages = async (arr) => idbKeyval.set(IMG_KEY(), arr);

  async function addImagesFromInput(files) {
    const imgs = await listImages();
    for (const f of files) imgs.push({ title: '', blob: f });
    await saveImages(imgs);
    renderPhotoList();
  }
  async function renderPhotoList() {
    const list = el('photoList'); const count = el('photoCount'); if (!list) return;
    const imgs = await listImages(); list.innerHTML = '';
    imgs.forEach((it, i) => {
      const row = document.createElement('div'); row.className = 'item';
      const blobUrl = URL.createObjectURL(it.blob);
      row.innerHTML = `<img src="${blobUrl}" alt="kuva ${i+1}"><input class="photo-title" data-i="${i}" placeholder="Kuvan nimi (valinnainen)" value="${it.title || ''}">`;
      list.appendChild(row);
      row.querySelector('.photo-title').addEventListener('input', async (e) => {
        const idx = Number(e.target.dataset.i); const arr = await listImages();
        arr[idx].title = e.target.value.trim(); await saveImages(arr);
      });
    });
    count.textContent = `Liitetty ${imgs.length} kuvaa.`;
  }

  // --- Lomake ---
  function buildFormView() {
    form.style.display = 'block';
    buildForm();
    const h1 = form.querySelector('h1');
    if (h1 && window.companyLogo) {
      h1.innerHTML = `<img class="brand-logo" src="${window.companyLogo}" alt="KV Asennus"> Käyttöönottotarkastuspöytäkirja`;
    }
  }

  const sectionHeader = (n, title, collapsible = true) => `
    <div class="section ${collapsible ? 'collapsible' : 'always-open'}" id="sec-${n}">
      <div class="section-header">
        <h2>${n}. ${title}</h2>
        ${collapsible ? `<label class="section-toggle"><input type="checkbox" class="section-include"> <span>Sisällytä</span></label>` : ''}
      </div>
      <div class="section-content">
  `;
  const sectionFooter = `</div></div>`;

  function buildForm() {
    formContent.innerHTML = [
      section1(), section2(), section3(), section4(), section5(), section6(),
      section7(), section8(), section9(), section10(), section11(), section12(),
      section13(), section14()
    ].join('');

    wireSectionToggles();
    wireGps();
    wirePhotos();
    wireDynamicRows();
    setupSignature();
  }

  function section1() {
    return `
      ${sectionHeader(1, 'PERUSTIEDOT', true)}
        <div class="sub-section">
          <h3>1.1 Sähkölaitteiston rakentaja</h3>
          <div class="keypairs">
            <div><label>Nimi</label><div>KV Asennus</div></div>
            <div><label>Y‑tunnus</label><div>2753534-7</div></div>
            <div><label>Tukes</label><div>219445-001</div></div>
            <div><label>Osoite</label><div>Lummekatu 10, 78850 Varkaus</div></div>
            <div><label>Sähkötöiden johtaja</label><div>Vesa Kauppinen</div></div>
            <div><label>Puhelin</label><div>040 763 5648</div></div>
          </div>
        </div>
        <div class="sub-section">
          <h3>1.2 Kohteen tiedot</h3>
          <button type="button" id="btnGps" class="btn-success">Hae sijainti GPS:llä</button>
          <span id="gpsStatus" class="muted"></span>
          <input type="hidden" id="gps-lat"><input type="hidden" id="gps-lon">
          <label>Katuosoite</label><input id="street">
          <label>Postinumero</label><input id="postalCode">
          <label>Postitoimipaikka</label><input id="city">
          <label>Kohteen yksilöinti (esim. keskus)</label><input id="locationId" placeholder="Esim. OKT Virtanen, Mittaus- ja ryhmäkeskus">
          <label>Liitä kuvia kohteesta</label>
          <input id="photos" type="file" accept="image/*" multiple>
          <div id="photoList" class="photo-list"></div>
          <div id="photoCount" class="muted">Liitetty 0 kuvaa.</div>
          <h4 class="muted">Tilaaja</h4>
          <label>Nimi</label><input id="clientName">
          <label>Yhteyshenkilö</label><input id="contactName">
          <label>Puhelin</label><input id="clientPhone">
        </div>
      ${sectionFooter}
    `;
  }
  function section2() { return `${sectionHeader(2,'AISTINVARAINEN TARKASTUS')}
    <div class="checkbox-group"><input id="sec2-na" type="checkbox"><label for="sec2-na">Ei kuulu tarkastukseen</label></div>
    <div class="checkbox-group"><input id="sec2-ok" type="checkbox"><label for="sec2-ok">Asennukset on aistinvaraisessa tarkastuksessa todettu vaatimusten mukaisiksi</label></div>
    <label>Lisätietoja</label><textarea id="sec2-notes" rows="3" placeholder="Vapaa lisäselvitys..."></textarea>
  ${sectionFooter}`; }
  function section3() { return `${sectionHeader(3,'SUOJAJOHTIMIEN JATKUVUUS')}
    <div class="checkbox-group"><input id="s3-all" type="checkbox"><label for="s3-all">Todettu kaikista laitteista ja pistorasioista</label></div>
    <div class="checkbox-group"><input id="s3-ok" type="checkbox"><label for="s3-ok">Jatkuvuus todettu vaatimusten mukaiseksi</label></div>
    <p class="muted">(PE‑, PEN‑, maadoitus‑, pää- ja lisäpotentiaalintasausjohtimet)</p>
    <div class="table-like" id="s3-table"><div class="table-row header"><div>Mittauspiste</div><div>Resistanssi (Ω)</div><div></div></div></div>
    <button type="button" class="button-like" data-add-row="s3">+ Lisää mittaus</button>
    <div class="muted" id="s3-max"></div>
  ${sectionFooter}`; }
  function section4() { return `${sectionHeader(4,'ERISTYSRESISTANSSI')}
    <div class="table-like" id="s4-table"><div class="table-row header"><div>Kohde</div><div>Resistanssi (MΩ)</div><div>Huom</div></div></div>
    <button type="button" class="button-like" data-add-row="s4">+ Lisää mittaus</button>
    <div class="checkbox-group"><input id="s4-ok" type="checkbox"><label for="s4-ok">Eristysresistanssit todettu vaatimusten mukaisiksi</label></div>
    <div class="checkbox-group"><input id="s4-restore" type="checkbox"><label for="s4-restore">PE- ja N-johtimien yhdistys on palautettu mittausten jälkeen</label></div>
  ${sectionFooter}`; }
  function section5() { return `${sectionHeader(5,'SYÖTÖN AUTOMAATTINEN POISKYTKENTÄ')}
    <div class="table-like" id="s5-table"><div class="table-row header"><div>Piste</div><div>Ik (A)</div><div>Zk (Ω)</div><div>Suojalaite</div><div></div></div></div>
    <button type="button" class="button-like" data-add-row="s5">+ Lisää mittaus</button>
    <div class="checkbox-group"><input id="s5-meas" type="checkbox"><label for="s5-meas">Arvot saatu mittaamalla</label></div>
    <div class="checkbox-group"><input id="s5-calc" type="checkbox"><label for="s5-calc">Arvot saatu laskemalla</label></div>
    <div class="checkbox-group"><input id="s5-std" type="checkbox"><label for="s5-std">Arvot ovat standardin mukaiset</label></div>
  ${sectionFooter}`; }
  function section6() { return `${sectionHeader(6,'VIKAVIRTASUOJAKYTKIN (RCD)')}
    <div class="checkbox-group"><input id="s6-btn" type="checkbox"><label for="s6-btn">Painiketestaus suoritettu</label></div>
    <div class="table-like" id="s6-table"><div class="table-row header"><div>Piiri / sijainti</div><div>IΔn (mA)</div><div>t (ms)</div><div>Huom</div><div></div></div></div>
    <button type="button" class="button-like" data-add-row="s6">+ Lisää mittaus</button>
  ${sectionFooter}`; }
  const section7 = () => `${sectionHeader(7,'KIERTOSUUNNAN TARKASTUS')}
    <div class="checkbox-group"><input id="s7-na" type="checkbox"><label for="s7-na">Ei sisälly tarkastukseen</label></div>
    <div class="checkbox-group"><input id="s7-ok" type="checkbox"><label for="s7-ok">Kiertosuunta tarkastettu ja todettu oikeaksi</label></div>
    <label>Lisätietoja</label><textarea id="s7-notes" rows="2"></textarea>
  ${sectionFooter}`;
  const section8 = () => `${sectionHeader(8,'TOIMINTA- JA KÄYTTÖTESTIT')}
    <div class="checkbox-group"><input id="s8-dev" type="checkbox"><label for="s8-dev">Koneet ja laitteet testattu</label></div>
    <div class="checkbox-group"><input id="s8-sys" type="checkbox"><label for="s8-sys">Toiminnalliset kokonaisuudet testattu</label></div>
  ${sectionFooter}`;
  const section9 = () => `${sectionHeader(9,'JÄNNITTEENALENEMA')}
    <label>Suurin jännitteenalenema %</label><input id="s9-drop" placeholder="esim. 1,5">
    <div class="checkbox-group"><input id="s9-meas" type="checkbox"><label for="s9-meas">Saatu mittaamalla</label></div>
    <div class="checkbox-group"><input id="s9-calc" type="checkbox"><label for="s9-calc">Saatu laskemalla</label></div>
  ${sectionFooter}`;
  const section10 = () => `${sectionHeader(10,'KÄYTTÖ-, HUOLTO- JA KUNNOSSAPITO-OHJEET')}
    <div class="checkbox-group"><input id="s10-na" type="checkbox"><label for="s10-na">Ei sisälly tarkastukseen</label></div>
    <div class="checkbox-group"><input id="s10-deliv" type="checkbox"><label for="s10-deliv">Toimitettu tilaajalle</label></div>
    <div class="checkbox-group"><input id="s10-noneed" type="checkbox"><label for="s10-noneed">Ei erillisiä ohjeita vaativia laitteita tai asennuksia</label></div>
  ${sectionFooter}`;
  const section11 = () => `${sectionHeader(11,'PALOVAROITTIMET')}
    <div class="checkbox-group"><input id="s11-none" type="checkbox"><label for="s11-none">Käyttöönotto­tarkastettaviin asennuksiin ei sisälly palovaroittimia.</label></div>
    <div class="checkbox-group"><input id="s11-req" type="checkbox"><label for="s11-req">Vakuutamme, että asennetut palovaroittimet täyttävät vaatimukset.</label></div>
    <div class="checkbox-group"><input id="s11-man" type="checkbox"><label for="s11-man">Käyttö‑ ja huolto‑ohjeet on luovutettu.</label></div>
    <label>Virran ja varavirran syötön toteutus:</label><textarea id="s11-power" rows="2"></textarea>
  ${sectionFooter}`;
  const section12 = () => `${sectionHeader(12,'ECODESIGN ASETUS')}
    <div class="checkbox-group"><input id="s12-na" type="checkbox"><label for="s12-na">Asennuksiin ei sisälly asetuksen piiriin kuuluvia sähkölämmittimiä.</label></div>
    <div class="checkbox-group"><input id="s12-yes" type="checkbox"><label for="s12-yes">Asennuksiin sisältyy sähkölämmittimiä, joista on laadittu erillinen pöytäkirja (ST 55.05.01).</label></div>
  ${sectionFooter}`;
  const section13 = () => `${sectionHeader(13,'KÄYTETYT MITTALAITTEET')}
    <textarea id="s13-devices" rows="2">Eurotest EASI / MI 3100SE</textarea>
  ${sectionFooter}`;
  const section14 = () => `${sectionHeader(14,'Tarkastuksen tekijä', true)}
    <label>Päivä</label><input id="s14-date" type="date"> <label>Aika</label><input id="s14-time" type="time">
    <label>Nimen selvennys</label><input id="s14-name" placeholder="Vesa Kauppinen">
    <div class="signature-pad"><canvas id="sig" width="600" height="160"></canvas></div>
    <button type="button" id="sig-clear">Tyhjennä allekirjoitus</button>
  ${sectionFooter}`;

  // --- wiring ---
  function wireSectionToggles() {
    document.querySelectorAll('.section').forEach((sec) => {
      const header = sec.querySelector('.section-header');
      header?.addEventListener('click', (e) => {
        if ((e.target).closest('.section-toggle')) return; // älä avaa kun klikataan itse ruutua
        sec.classList.toggle('active');
      });
      const cb = sec.querySelector('.section-include');
      if (cb) cb.addEventListener('change', () => {
        if (cb.checked) {
          sec.classList.add('active');
          // §14: automaattiset esitäytöt + skaalaus allekirjoitukselle
          if (sec.id === 'sec-14') { prefillInspector(); setTimeout(()=>window.dispatchEvent(new Event('resize')),0); }
        } else sec.classList.remove('active');
      });
    });
  }

  function prefillInspector(){
    const name = el('s14-name'); if (name && !name.value) name.value = 'Vesa Kauppinen';
    const d = el('s14-date'); const t = el('s14-time');
    const now = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const iso = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const tim = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (d && !d.value) d.value = iso;
    if (t && !t.value) t.value = tim;
  }

  function wireGps() {
    el('btnGps')?.addEventListener('click', () => {
      const st = el('gpsStatus'); st.textContent = 'Haetaan…';
      navigator.geolocation?.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude.toFixed(6); const lon = pos.coords.longitude.toFixed(6);
        el('gps-lat').value = lat; el('gps-lon').value = lon; st.textContent = `OK (${lat}, ${lon})`;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=fi&lat=${lat}&lon=${lon}&email=example@example.com`;
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const j = await res.json(); const a = j.address || {};
            const street = [a.road, a.house_number].filter(Boolean).join(' ');
            const city = a.city || a.town || a.village || a.municipality || '';
            if (street) el('street').value = street;
            if (a.postcode) el('postalCode').value = a.postcode;
            if (city) el('city').value = city;
          }
        } catch(e){ console.warn('Reverse geocode failed', e); }
      }, () => { st.textContent = 'Sijaintia ei saatu'; });
    });
  }

  function wirePhotos() {
    el('photos')?.addEventListener('change', (e) => addImagesFromInput([...e.target.files]));
    renderPhotoList();
  }

  function wireDynamicRows() {
    document.querySelectorAll('[data-add-row]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-add-row');
        if (t === 's3') addRowS3();
        if (t === 's4') addRowS4();
        if (t === 's5') addRowS5();
        if (t === 's6') addRowS6();
      });
    });
  }

  function addRowS3(){
    const host = el('s3-table'); const row = document.createElement('div'); row.className='table-row';
    row.innerHTML = `<div><input data-col="piste" placeholder="Mittauspiste"></div>
      <div><input data-col="r" type="text" placeholder="0,20"></div>
      <div><button type="button" class="button-like" data-del>×</button></div>`;
    host.appendChild(row);
    row.querySelector('[data-del]').addEventListener('click', () => { row.remove(); updateS3Max(); });
    row.querySelector('[data-col="r"]').addEventListener('input', updateS3Max);
    updateS3Max();
  }
  function updateS3Max(){
    const vals = [...document.querySelectorAll('#s3-table [data-col="r"]')].map(i=>parseFloat(String(i.value).replace(',','.'))).filter(v=>!isNaN(v));
    el('s3-max').textContent = vals.length>1 ? `Suurin resistanssi: ${Math.max(...vals).toString().replace('.',',')} Ω` : '';
  }
  function addRowS4(){ const host=el('s4-table'); const row=document.createElement('div'); row.className='table-row'; row.innerHTML=`<div><input data-col="kohde" placeholder="Uusi asennus"></div><div><input data-col="rm" type="text" placeholder=">999"></div><div><input data-col="huom" placeholder="Huom"></div>`; host.appendChild(row); }
  function addRowS5(){ const host=el('s5-table'); const row=document.createElement('div'); row.className='table-row'; row.innerHTML=`<div><input data-col="piste" placeholder="2 pistorasiaa"></div><div><input data-col="ik" type="text" placeholder="500"></div><div><input data-col="zk" type="text" placeholder="0,5"></div><div><input data-col="prot" placeholder="C10 johdon suoja"></div><div><button type="button" class="button-like" data-del>×</button></div>`; host.appendChild(row); row.querySelector('[data-del]').addEventListener('click',()=>row.remove()); }
  function addRowS6(){ const host=el('s6-table'); const row=document.createElement('div'); row.className='table-row'; row.innerHTML=`<div><input data-col="piiri" placeholder="Esim. Kylpyhuone"></div><div><input data-col="idn" type="text" placeholder="30"></div><div><input data-col="t" type="text" placeholder="25"></div><div><input data-col="huom" placeholder="Huom"></div><div><button type="button" class="button-like" data-del>×</button></div>`; host.appendChild(row); row.querySelector('[data-del]').addEventListener('click',()=>row.remove()); }

  // Allekirjoitus
  function setupSignature(){
    const canvas = el('sig'); if(!canvas) return;
    const ctx = canvas.getContext('2d');

    // Estä sivun eleet piirtäessä ilman CSS-muutoksia
    canvas.style.touchAction = 'none';

    function resizeCanvas(){
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      // Jos osio on piilossa (leveys 0), käytä fallback-kokoa
      const cssW = rect.width  || canvas.offsetWidth  || 600;
      const cssH = rect.height || canvas.offsetHeight || 160;

      // Nollaa aiempi skaalaus → aseta "sisäinen" koko → skaalaa takaisin
      ctx.setTransform(1,0,0,1,0,0);
      canvas.width  = Math.max(1, Math.round(cssW * ratio));
      canvas.height = Math.max(1, Math.round(cssH * ratio));
      ctx.setTransform(ratio,0,0,ratio,0,0);

      // Viivan oletus
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
    }

    function pos(e){
      const r = canvas.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX);
      const cy = (e.touches ? e.touches[0].clientY : e.clientY);
      return { x: cx - r.left, y: cy - r.top };
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    let drawing = false, prev = null;

    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      canvas.setPointerCapture?.(e.pointerId);
      prev = pos(e);
      e.preventDefault();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      prev = p;
      e.preventDefault();
    });

    const stop = (e) => { drawing = false; e && e.preventDefault(); };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', stop);

    // Tyhjennys säilyttäen skaalauksen
    el('sig-clear')?.addEventListener('click', () => {
      const t = ctx.getTransform();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(t);
    });
  }

  // Tyhjennä koko lomake
  async function askAndClear(){
    if (!confirm('Tyhjennetäänkö koko lomake? Tätä toimintoa ei voi perua.')) return;
    // Tyhjää kaikki inputit/checkboxit/taulukkorivit
    form.querySelectorAll('input, textarea').forEach((n)=>{
      if (n.type==='checkbox') n.checked=false; else n.value='';
    });
    // Taulukot takaisin pelkkiin otsikkoriveihin
    el('s3-table').innerHTML = '<div class="table-row header"><div>Mittauspiste</div><div>Resistanssi (Ω)</div><div></div></div>';
    el('s4-table').innerHTML = '<div class="table-row header"><div>Kohde</div><div>Resistanssi (MΩ)</div><div>Huom</div></div>';
    el('s5-table').innerHTML = '<div class="table-row header"><div>Piste</div><div>Ik (A)</div><div>Zk (Ω)</div><div>Suojalaite</div><div></div></div>';
    el('s6-table').innerHTML = '<div class="table-row header"><div>Piiri / sijainti</div><div>IΔn (mA)</div><div>t (ms)</div><div>Huom</div><div></div></div>';
    // Kuvapuskuri pois
    await idbKeyval.del(IMG_KEY()); renderPhotoList();
    // Sulje osiot ja poista "Sisällytä"-valinnat
    document.querySelectorAll('.section').forEach(sec=>{ sec.classList.remove('active'); const cb=sec.querySelector('.section-include'); if(cb) cb.checked=false; });
  }

  // --- PDF ---
  async function generatePdf(){
    const loader=el('loader'), loaderText=el('loader-text'); loaderText.textContent='Luodaan PDF…'; loader.style.display='flex';
    try{
      const { jsPDF } = window.jspdf; const doc=new jsPDF('p','mm','a4');
      const M=15, W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(); const LH=7; let y=M+12;
      const logoUrl = await getLogoDataUrl();
      const checkBreak=(extra=0)=>{ if(y+extra>H-M){ doc.addPage(); y=M+12; drawHeader(); } };
      const text=(t,x,yy,opt)=>doc.text(String(t),x,yy,opt);
      const include=(n)=>!!document.querySelector(`#sec-${n} .section-include`)?.checked;
      const pdfBox=(id,label)=>checkboxLine(label,!!el(id)?.checked);
      const labelValue=(label,value)=>{ if(!value) return; checkBreak(); doc.setFont(undefined,'bold'); text(label,M,y); doc.setFont(undefined,'normal'); const wrapped=doc.splitTextToSize(String(value),W-M*2-62); text(wrapped,M+62,y); y+=Math.max(LH, wrapped.length*(LH-1)); };
      const BOX_STYLE = 'cross'; // 'tick' | 'cross' | 'fill'
const checkboxLine=(label,checked=true)=>{
  checkBreak();
  const size = 5.2;               // ruudun koko mm
  const x = M;
  const top = y - size + 1.6;      // ← SÄÄDÄ TÄSTÄ pystysuuntaista kohdistusta (1.6–2.0)

  // ruutu
  doc.setLineWidth(0.25);
  doc.rect(x, top, size, size);

  // merkintä
  if (checked) {
    if (BOX_STYLE === 'tick') {
      // ✓-merkki viivoilla, keskitetty ruutuun
      const x1 = x + size * 0.18, y1 = top + size * 0.55;
      const x2 = x + size * 0.42, y2 = top + size * 0.82;
      const x3 = x + size * 0.86, y3 = top + size * 0.18;
      doc.setLineWidth(0.4);
      doc.line(x1, y1, x2, y2);
      doc.line(x2, y2, x3, y3);
      doc.setLineWidth(0.25);
    } else if (BOX_STYLE === 'cross') {
      // X-merkki
      doc.setLineWidth(0.4);
      doc.line(x + 1.0, top + 1.0, x + size - 1.0, top + size - 1.0);
      doc.line(x + size - 1.0, top + 1.0, x + 1.0, top + size - 1.0);
      doc.setLineWidth(0.25);
    } else if (BOX_STYLE === 'fill') {
      // täplätty/solidi
      doc.setFillColor(0);
      doc.rect(x + 1, top + 1, size - 2, size - 2, 'F');
    }
  }

  text(label, x + size + 3, y);
  y += LH;
};
      const header=(t)=>{ checkBreak(); y+=5; doc.setFont(undefined,'bold'); doc.setFontSize(12); text(t,M,y); doc.setFontSize(10); doc.setFont(undefined,'normal'); y+=6; };
      const drawHeader=()=>{ if(logoUrl){ doc.addImage(logoUrl,'PNG', M, M, 26, 10, '', 'FAST'); } doc.setFontSize(16); doc.setFont(undefined,'bold'); text('Käyttöönottotarkastuspöytäkirja', M+31, M+8); doc.setFontSize(10); doc.setFont(undefined,'normal'); };
      drawHeader();

      // --- 1 ---
      header('1. PERUSTIEDOT');
      if(!include(1)) checkboxLine('Ei sisälly tarkastukseen'); else {
        doc.setFont(undefined,'bold'); text('1.1 Sähkölaitteiston rakentaja',M,y); doc.setFont(undefined,'normal'); y+=LH;
        labelValue('Sähkölaitteiston rakentaja:','KV Asennus, Y: 2753534-7, Tukes: 219445-001');
        labelValue('Osoite:','Lummekatu 10, 78850 Varkaus');
        labelValue('Sähkötöiden johtaja:','Vesa Kauppinen');
        labelValue('Puhelin:','040 763 5648');
        y+=2; doc.setFont(undefined,'bold'); text('1.2 Kohteen tiedot',M,y); doc.setFont(undefined,'normal'); y+=LH;
        labelValue('Kohteen katuosoite:', el('street')?.value);
        labelValue('Postinumero ja -toimipaikka:', `${el('postalCode')?.value || ''} ${el('city')?.value || ''}`.trim());
        labelValue('Kohteen yksilöinti:', el('locationId')?.value);
        labelValue('Tilaaja:', el('clientName')?.value);
        labelValue('Yhteyshenkilö:', el('contactName')?.value);
        labelValue('Puhelin:', el('clientPhone')?.value);
        const imgs = await listImages(); labelValue('Liitteet:', imgs.length?`${imgs.length} kuvaa`:'Ei liitteitä');
        if (el('gps-lat')?.value && el('gps-lon')?.value){ const lat=el('gps-lat').value, lon=el('gps-lon').value; labelValue('GPS-koordinaatit:', `${lat}, ${lon}`); labelValue('Karttalinkki:', `https://maps.google.com/?q=${lat},${lon}`); }
      }

      // --- 2 ---
      header('2. AISTINVARAINEN TARKASTUS');
      if(!include(2)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('sec2-na','Ei kuulu tarkastukseen'); pdfBox('sec2-ok','Asennukset on aistinvaraisessa tarkastuksessa todettu vaatimusten mukaisiksi'); if(el('sec2-notes')?.value?.trim()) labelValue('Lisätietoja:', el('sec2-notes').value.trim()); }

      // --- 3 ---
      header('3. SUOJAJOHTIMIEN JATKUVUUS');
      if(!include(3)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s3-all','Todettu kaikista laitteista ja pistorasioista'); pdfBox('s3-ok','Jatkuvuus todettu vaatimusten mukaiseksi'); text('(PE‑, PEN‑, maadoitus‑, pää- ja lisäpotentiaalintasausjohtimet)',M,y); y+=LH; const rows3=[...document.querySelectorAll('#s3-table .table-row:not(.header)')].map(r=>[r.querySelector('[data-col="piste"]').value,r.querySelector('[data-col="r"]').value]).filter(r=>r[0]||r[1]); if(rows3.length){ doc.autoTable({ startY:y, head:[['Mittauspiste','Resistanssi (Ω)']], body:rows3, styles:{fontSize:9}, margin:{left:M,right:M} }); y=doc.lastAutoTable.finalY+2; const nums=rows3.map(r=>parseFloat(String(r[1]).replace(',','.'))).filter(v=>!isNaN(v)); if(nums.length>1) labelValue('Suurin resistanssi:', `${Math.max(...nums).toString().replace('.',',')} Ω`); } }

      // --- 4 ---
      header('4. ERISTYSRESISTANSSI');
      if(!include(4)) checkboxLine('Ei sisälly tarkastukseen'); else { const rows4=[...document.querySelectorAll('#s4-table .table-row:not(.header)')].map(r=>[r.querySelector('[data-col="kohde"]').value,r.querySelector('[data-col="rm"]').value,r.querySelector('[data-col="huom"]').value]).filter(r=>r.some(Boolean)); if(rows4.length){ doc.autoTable({ startY:y, head:[['Kohde','Resistanssi (MΩ)','Huom']], body:rows4, styles:{fontSize:9}, margin:{left:M,right:M} }); y=doc.lastAutoTable.finalY+2; } pdfBox('s4-ok','Eristysresistanssit todettu vaatimusten mukaisiksi'); pdfBox('s4-restore','PE- ja N-johtimien yhdistys on palautettu mittausten jälkeen'); }

      // --- 5 ---
      header('5. SYÖTÖN AUTOMAATTINEN POISKYTKENTÄ');
      if(!include(5)) checkboxLine('Ei sisälly tarkastukseen'); else { const rows5=[...document.querySelectorAll('#s5-table .table-row:not(.header)')].map(r=>[r.querySelector('[data-col="piste"]').value,r.querySelector('[data-col="ik"]').value,r.querySelector('[data-col="zk"]').value,r.querySelector('[data-col="prot"]').value]).filter(r=>r.some(Boolean)); if(rows5.length){ doc.autoTable({ startY:y, head:[['Piste','Ik (A)','Zk (Ω)','Suojalaite']], body:rows5, styles:{fontSize:9}, margin:{left:M,right:M} }); y=doc.lastAutoTable.finalY+2; } pdfBox('s5-meas','Arvot saatu mittaamalla'); pdfBox('s5-calc','Arvot saatu laskemalla'); pdfBox('s5-std','Arvot ovat standardin mukaiset'); }

      // --- 6 ---
      header('6. VIKAVIRTASUOJAKYTKIN (RCD)');
      if(!include(6)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s6-btn','Painiketestaus suoritettu'); const rows6=[...document.querySelectorAll('#s6-table .table-row:not(.header)')].map(r=>[r.querySelector('[data-col="piiri"]').value,r.querySelector('[data-col="idn"]').value,r.querySelector('[data-col="t"]').value,r.querySelector('[data-col="huom"]').value]).filter(r=>r.some(Boolean)); if(rows6.length){ doc.autoTable({ startY:y, head:[['Piiri / sijainti','IΔn (mA)','t (ms)','Huom']], body:rows6, styles:{fontSize:9}, margin:{left:M,right:M} }); y=doc.lastAutoTable.finalY+2; } }

      // --- 7 ---
      header('7. KIERTOSUUNNAN TARKASTUS');
      if(!include(7)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s7-na','Ei sisälly tarkastukseen'); pdfBox('s7-ok','Kiertosuunta tarkastettu ja todettu oikeaksi'); if(el('s7-notes')?.value?.trim()) labelValue('Lisätietoja:', el('s7-notes').value.trim()); }

      // --- 8 ---
      header('8. TOIMINTA- JA KÄYTTÖTESTIT');
      if(!include(8)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s8-dev','Koneet ja laitteet testattu'); pdfBox('s8-sys','Toiminnalliset kokonaisuudet testattu'); }

      // --- 9 ---
      header('9. JÄNNITTEENALENEMA');
      if(!include(9)) checkboxLine('Ei sisälly tarkastukseen'); else { const norm=(v)=>{ if(!v) return ''; let s=String(v).replace('%','').replace(',','.'); const f=parseFloat(s); if(isNaN(f)) return v; return `${String(f).replace('.',',')} %`;}; const drop=norm(el('s9-drop')?.value); if(drop) labelValue('Suurin jännitteenalenema:', drop); pdfBox('s9-meas','Saatu mittaamalla'); pdfBox('s9-calc','Saatu laskemalla'); }

      // --- 10 ---
      header('10. KÄYTTÖ-, HUOLTO- JA KUNNOSSAPITO-OHJEET');
      if(!include(10)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s10-na','Ei sisälly tarkastukseen'); pdfBox('s10-deliv','Toimitettu tilaajalle'); pdfBox('s10-noneed','Ei erillisiä ohjeita vaativia laitteita tai asennuksia'); }

      // --- 11 ---
      header('11. PALOVAROITTIMET');
      if(!include(11)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s11-none','Käyttöönotto­tarkastettaviin asennuksiin ei sisälly palovaroittimia.'); pdfBox('s11-req','Vakuutamme, että asennetut palovaroittimet täyttävät vaatimukset.'); pdfBox('s11-man','Käyttö‑ ja huolto‑ohjeet on luovutettu.'); if(el('s11-power')?.value?.trim()) labelValue('Virran ja varavirran syötön toteutus:', el('s11-power').value.trim()); }

      // --- 12 ---
      header('12. ECODESIGN ASETUS');
      if(!include(12)) checkboxLine('Ei sisälly tarkastukseen'); else { pdfBox('s12-na','Asennuksiin ei sisälly asetuksen piiriin kuuluvia sähkölämmittimiä.'); pdfBox('s12-yes','Asennuksiin sisältyy sähkölämmittimiä, joista on laadittu erillinen pöytäkirja (ST 55.05.01).'); }

      // --- 13 ---
      header('13. KÄYTETYT MITTALAITTEET');
      if(!include(13)) checkboxLine('Ei sisälly tarkastukseen'); else { if(el('s13-devices')?.value?.trim()) labelValue('', el('s13-devices').value.trim()); }

      // --- 14 ---
      header('14. Tarkastuksen tekijä');
      if(!include(14)) checkboxLine('Ei sisälly tarkastukseen'); else { const d=el('s14-date')?.value, t=el('s14-time')?.value; const ts=(d||t)?`${d||''}${t?(d?' klo ':'')+t:''}`:''; if(ts) labelValue('Päiväys:', ts); labelValue('Nimen selvennys:', el('s14-name')?.value || 'Vesa Kauppinen'); const sig=el('sig'); if(sig){ const data=sig.toDataURL('image/png'); if(!data.endsWith('data:,')){ checkBreak(30); text('Allekirjoitus:', M, y); y+=6; doc.addImage(data,'PNG',M,y,80,25); y+=30; } } }

      // Liitteet
      const imgsAll = await listImages();
      if(imgsAll.length){
        header('LIITTEET: VALOKUVAT');
        const PX_TO_MM = 25.4 / 96;
        const LABEL_GAP = 6;
        const IMAGE_GAP = 10;
        const pageWidth = W - M * 2;

        for(let i=0;i<imgsAll.length;i++){
          const it = imgsAll[i];
          const name = it.title?.trim() || `Kuva ${i+1}`;
          const dataUrl = await blobToDataURL(it.blob);
          const imgSize = await getImageSize(dataUrl);
          const pxWidth = imgSize.width || 1;
          const pxHeight = imgSize.height || 1;
          const aspect = pxWidth / pxHeight;
          const naturalWidth = pxWidth * PX_TO_MM;
          const naturalHeight = pxHeight * PX_TO_MM;
          const maxWidth = Math.max(1, Math.min(pageWidth, naturalWidth));
          const maxHeight = Math.max(1, naturalHeight);

          const computeSize = () => {
            const available = H - M - IMAGE_GAP - (y + LABEL_GAP);
            const allowedHeight = Math.max(1, Math.min(available, maxHeight));
            let w = maxWidth;
            let h = w / aspect;
            if(!isFinite(h) || h <= 0){
              h = allowedHeight;
              w = h * aspect;
            }
            if(h > allowedHeight){
              h = allowedHeight;
              w = h * aspect;
            }
            return { width: w, height: h, available };
          };

          let { width: drawW, height: drawH, available } = computeSize();
          if(available <= 0 || drawH <= 0 || y + LABEL_GAP + drawH + IMAGE_GAP > H - M){
            doc.addPage();
            y = M + 12;
            drawHeader();
            ({ width: drawW, height: drawH, available } = computeSize());
          }

          doc.setFont(undefined,'bold');
          text(`Kuva ${i+1}: ${name}`, M, y);
          doc.setFont(undefined,'normal');
          y += LABEL_GAP;

          doc.addImage(dataUrl,'PNG', M, y, drawW, drawH);
          y += drawH + IMAGE_GAP;
        }
      }

      doc.save('kayttoonottotarkastus.pdf');
    } catch(e){ console.error(e); alert('PDF:n luonti epäonnistui'); } finally { el('loader').style.display='none'; }
  }

  // Logo DataURL fallbackit
  async function getLogoDataUrl(){
    if (window.companyLogo) return window.companyLogo;
    const imgEl = document.querySelector('.brand-logo');
    if (imgEl && imgEl.src){
      if (imgEl.src.startsWith('data:')) return imgEl.src;
      try { const res = await fetch(imgEl.src); const blob = await res.blob(); return await blobToDataURL(blob); } catch { /* ignore */ }
    }
    return null;
  }

  function blobToDataURL(blob){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(blob); }); }
  function getImageSize(dataUrl){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = dataUrl;
    });
  }
})();

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const DB_NAME = "ConteaAppDB";
const STORE_NAME = "foto";

const DATI_CONDOMINIO_DEFAULT = {
  indirizzo: "",
  anno: "",
  corpiFabbrica: "",
  vaniScala: "",
  unitaImmobiliari: "",
  cortile: false,
  giardino: false,
  autorimessa: false,
  cantine: false,
  centraleTermica: false,
};

const PRESENZE = [
  { key: "cortile", label: "Cortile" },
  { key: "giardino", label: "Giardino" },
  { key: "autorimessa", label: "Autorimessa" },
  { key: "cantine", label: "Cantine" },
  { key: "centraleTermica", label: "Centrale termica" },
];

const AMBIENTI_ORDINE_GESTIONALE = [
  "🏠 Terrazza condominiale",
  "🧺 Locale lavatoio",
  "🏚️ Soffitte",
  "🪟 Finestre condominiali",
  "🏢 Vano scala condominiale",
  "🛗 Impianto ascensore",
  "⚡ Contatori elettrici",
  "🧰 Cantine",
  "🏙️ Chiostrina condominiale",
  "🚗 Autorimessa",
  "🧱 Fabbricato esterno",
  "🔥 Caldaia condominiale",
  "🧯 Dispositivi e impianti antincendio",
  "☣️ Amianto",
  "👷 Dipendente condominiale",
];

function apriDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function salvaFotoDB(blob) {
  const db = await apriDB();
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, blob });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

async function leggiFotoDB(id) {
  const db = await apriDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

async function cancellaFotoDB(id) {
  if (!id) return;

  const db = await apriDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
  });
}

function App() {
  const [ambienteSelezionato, setAmbienteSelezionato] = useState(null);
  const [fotoBlobList, setFotoBlobList] = useState([]);
  const [fotoPreviewList, setFotoPreviewList] = useState([]);
  const [riferimento, setRiferimento] = useState("");
  const [criticitaSelezionata, setCriticitaSelezionata] = useState("");
  const [nota, setNota] = useState("");

  const [datiCondominio, setDatiCondominio] = useState(() => {
    try {
      const salvati = localStorage.getItem("datiCondominio");
      return salvati
        ? { ...DATI_CONDOMINIO_DEFAULT, ...JSON.parse(salvati) }
        : DATI_CONDOMINIO_DEFAULT;
    } catch {
      return DATI_CONDOMINIO_DEFAULT;
    }
  });

  const [rilievi, setRilievi] = useState(() => {
    try {
      const salvati = localStorage.getItem("rilieviSopralluogo");
      return salvati ? JSON.parse(salvati) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("datiCondominio", JSON.stringify(datiCondominio));
  }, [datiCondominio]);

  useEffect(() => {
    localStorage.setItem("rilieviSopralluogo", JSON.stringify(rilievi));
  }, [rilievi]);

  const ambienti = AMBIENTI_ORDINE_GESTIONALE;

  const criticitaPerAmbiente = {
    "🏠 Terrazza condominiale": [
      "Accesso difficoltoso",
      "Altezza ridotta/filo altezza uomo",
      "Antenna divelta a terra",
      "Antenna pericolante",
      "Assenza parapetto",
      "Condizioni malsane",
      "Crepe",
      "Degrado intonaco esterno",
      "Dislivello/gradino non segnalato",
      "Guano piccioni",
      "Materiale accatastato",
      "Parapetto < 1m",
      "Parapetto scalabile",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniera divelta",
      "Scala accesso torrino non conforme",
      "Vasi davanzali",
      "Altro",
    ],
    "🧺 Locale lavatoio": [
      "Altezza ridotta/filo altezza uomo",
      "Antenna divelta a terra",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Scatole derivazione aperte",
      "Altro",
    ],
    "🏚️ Soffitte": [
      "Altezza ridotta/filo altezza uomo",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Scatole derivazione aperte",
      "Altro",
    ],
    "🪟 Finestre condominiali": [
      "Infissi vetusti/vetri danneggiati",
      "Parapetto < 1m",
      "Parapetto scalabile",
      "Altro",
    ],
    "🏢 Vano scala condominiale": [
      "Altezza ridotta/filo altezza uomo",
      "Assenza parapetto",
      "Assenza corrimano",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Gradino rotto",
      "Guano piccioni",
      "Infiltrazioni/distacco intonaco",
      "Infissi vetusti/vetri danneggiati",
      "Materiale accatastato",
      "Parapetto < 1m",
      "Parapetto scalabile",
      "Passaggi ristretti",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Altro",
    ],
    "🛗 Impianto ascensore": [
      "Assenza cartellonistica",
      "Dislivello cabina/piano",
      "Scatola chiave manomessa",
      "Pulsante sgancio rotto",
      "Illuminazione insufficiente",
      "Locale macchina non accessibile",
      "Altro",
    ],
    "⚡ Contatori elettrici": [
      "Assenza cartellonistica",
      "Assenza segnale rischio elettrico",
      "Contatori non protetti/non segregati",
      "Quadro elettrico aperto",
      "Scatole derivazione aperte",
      "Materiale combustibile presente",
      "Altro",
    ],
    "🧰 Cantine": [
      "Altezza ridotta/filo altezza uomo",
      "Assenza corrimano",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Presenza FAV",
      "Scatole derivazione aperte",
      "Altro",
    ],
    "🏙️ Chiostrina condominiale": [
      "Accesso difficoltoso",
      "Altezza ridotta/filo altezza uomo",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Presenza FAV",
      "Scatole derivazione aperte",
      "Vasi davanzali",
      "Altro",
    ],
    "🚗 Autorimessa": [
      "Altezza ridotta/filo altezza uomo",
      "Assenza corrimano",
      "Assenza cartellonistica",
      "Assenza protezione",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Infissi vetusti/vetri danneggiati",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Percorsi promiscui auto/pedoni",
      "Presenza FAV",
      "Pulsante sgancio/cartellonistica",
      "Scala danneggiata",
      "Scatole derivazione aperte",
      "Altro",
    ],
    "🧱 Fabbricato esterno": [
      "Cantiere presente",
      "Cedimento muro di sostegno",
      "Crepe su pareti",
      "Degrado intonaco esterno",
      "Elementi pericolanti",
      "Messa in sicurezza assente",
      "Vasi su davanzale",
      "Altro",
    ],
    "🔥 Caldaia condominiale": [
      "Assenza corrimano",
      "Altezza ridotta/filo altezza uomo",
      "Cartello valvola e interruttore generale",
      "Condizioni malsane",
      "Crepe",
      "Dislivello/gradino non segnalato",
      "Infiltrazioni/distacco intonaco",
      "Materiale accatastato",
      "Pavimento scivoloso",
      "Pavimentazione sconnessa",
      "Plafoniere divelte",
      "Presenza FAV",
      "Scatole derivazione aperte",
      "Tubazione gas gialla",
      "Altro",
    ],
    "🧯 Dispositivi e impianti antincendio": [
      "Assenza estintore",
      "Manutenzione scaduta",
      "Porta tagliafuoco non funzionante",
      "Scarsa visibilità",
      "Tubazione idrante rossa",
      "Idrante non accessibile",
      "Assenza cartellonistica",
      "Altro",
    ],
    "☣️ Amianto": [
      "Presunta presenza di amianto",
      "Presenza certificata di amianto",
      "Materiale deteriorato",
      "Necessaria verifica documentale",
      "Altro",
    ],
    "👷 Dipendente condominiale": [
      "Residente in condominio",
      "Mansioni svolte",
      "Vigilanza",
      "Pulizie aree comuni",
      "Smistamento posta",
      "Piccole riparazioni",
      "Giardinaggio",
      "Vigilanza notturna",
      "Formazione scaduta",
      "Formazione sicurezza",
      "Addetto antincendio",
      "Addetto primo soccorso",
      "Manovra a mano ascensore",
      "Portineria",
      "Mancanza servizi igienici",
      "Necessità sedia ergonomica",
      "Condizioni malsane",
      "Rischio elettrico/cavi a terra/prolunghe",
      "Necessità condizionatore",
      "Riscaldamento",
      "Assenza estintore",
      "Assenza cassetta di sicurezza",
      "Cassetta sicurezza scaduta",
      "Paletta pavimento bagnato",
      "Scala da lavoro conforme",
      "Attrezzatura pulizia",
      "Tagliaerba",
      "Decespugliatore",
      "Soffiatore",
      "Detergenti/candeggina/ammoniaca",
      "Acidi e solventi",
      "Prodotti non stoccati correttamente",
      "Vernici",
      "Benzina",
      "Guanti protezione mani",
      "Occhiali/paraschegge",
      "Mascherine polvere",
      "Facciale filtrante",
      "Manca scarpa antinfortunistica",
      "Tuta da lavoro",
      "Altro",
    ],
  };

  function nomePulito(testo) {
    return String(testo || "").replace(/[^\p{L}\p{N}\s<>/-]/gu, "").trim();
  }

  function nomeFileSicuro(testo) {
    return nomePulito(testo)
      .replace(/\s+/g, "_")
      .replaceAll("/", "-")
      .replaceAll("<", "minore_di")
      .replaceAll(">", "maggiore_di")
      .toLowerCase();
  }

  function testoCriticita(rilievo) {
    if (Array.isArray(rilievo.criticita)) {
      return rilievo.criticita.length ? rilievo.criticita.join(", ") : "-";
    }
    return rilievo.criticita || "-";
  }

  function getFotoIds(rilievo) {
    if (Array.isArray(rilievo.fotoIds)) return rilievo.fotoIds;
    if (rilievo.fotoId) return [rilievo.fotoId];
    return [];
  }

  function comprimiFoto(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 900;

          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.65);
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function caricaFoto(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const nuoviBlob = [];
    const nuovePreview = [];

    for (const file of files) {
      const blob = await comprimiFoto(file);
      nuoviBlob.push(blob);
      nuovePreview.push(URL.createObjectURL(blob));
    }

    setFotoBlobList([...fotoBlobList, ...nuoviBlob]);
    setFotoPreviewList([...fotoPreviewList, ...nuovePreview]);
    event.target.value = "";
  }

  function eliminaFotoTemporanea(indexDaEliminare) {
    setFotoBlobList(fotoBlobList.filter((_, index) => index !== indexDaEliminare));
    setFotoPreviewList(fotoPreviewList.filter((_, index) => index !== indexDaEliminare));
  }

  function pulisciFormRilievo() {
    setFotoBlobList([]);
    setFotoPreviewList([]);
    setRiferimento("");
    setCriticitaSelezionata("");
    setNota("");
  }

  function apriAmbiente(ambiente) {
    setAmbienteSelezionato(ambiente);
    pulisciFormRilievo();
  }

  async function salvaRilievo() {
    if (!criticitaSelezionata) {
      alert("Seleziona una criticità prima di salvare.");
      return;
    }

    const fotoIds = [];

    for (const blob of fotoBlobList) {
      const id = await salvaFotoDB(blob);
      fotoIds.push(id);
    }

    const nuovoRilievo = {
      ambiente: ambienteSelezionato,
      ambientePdf: nomePulito(ambienteSelezionato),
      riferimento,
      criticita: criticitaSelezionata,
      nota,
      fotoIds,
      dataOra: new Date().toLocaleString("it-IT"),
    };

    setRilievi([...rilievi, nuovoRilievo]);
    alert("Rilievo salvato!");
    pulisciFormRilievo();
  }

  function esportaPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Checklist Condominio", 20, 20);

    let y = 40;

    doc.setFontSize(14);
    doc.text("DATI CONDOMINIO", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Indirizzo: ${datiCondominio.indirizzo || "-"}`, 20, y);
    y += 8;
    doc.text(`Anno costruzione: ${datiCondominio.anno || "-"}`, 20, y);
    y += 8;
    doc.text(`Corpi fabbrica: ${datiCondominio.corpiFabbrica || "-"}`, 20, y);
    y += 8;
    doc.text(`Vani scala: ${datiCondominio.vaniScala || "-"}`, 20, y);
    y += 8;
    doc.text(`Unita immobiliari: ${datiCondominio.unitaImmobiliari || "-"}`, 20, y);
    y += 15;

    const presenze = PRESENZE
      .filter((p) => datiCondominio[p.key] === true)
      .map((p) => p.label);

    doc.text(`Presenze: ${presenze.length ? presenze.join(", ") : "-"}`, 20, y);
    y += 20;

    doc.setFontSize(14);
    doc.text("RILIEVI IN ORDINE CHECKLIST GESTIONALE", 20, y);
    y += 12;

    AMBIENTI_ORDINE_GESTIONALE.forEach((ambiente) => {
      const rilieviAmbiente = rilievi.filter((r) => r.ambiente === ambiente);

      if (rilieviAmbiente.length === 0) return;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(13);
      doc.text(nomePulito(ambiente).toUpperCase(), 20, y);
      y += 9;

      rilieviAmbiente.forEach((rilievo) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);

        const crit = doc.splitTextToSize(`- ${testoCriticita(rilievo)}`, 170);
        doc.text(crit, 25, y);
        y += crit.length * 6;

        doc.text(`Rif: ${rilievo.riferimento || "-"}`, 30, y);
        y += 6;

        const notaPdf = doc.splitTextToSize(`Nota: ${rilievo.nota || "-"}`, 160);
        doc.text(notaPdf, 30, y);
        y += notaPdf.length * 5;

        doc.text(`Foto: ${getFotoIds(rilievo).length}`, 30, y);
        y += 10;
      });

      y += 6;
    });

    doc.save("checklist-condominio.pdf");
  }

  async function esportaFotoZip() {
    const zip = new JSZip();
    let totaleFoto = 0;

    for (let i = 0; i < rilievi.length; i++) {
      const rilievo = rilievi[i];
      const fotoIds = getFotoIds(rilievo);

      for (let j = 0; j < fotoIds.length; j++) {
        const blob = await leggiFotoDB(fotoIds[j]);
        if (!blob) continue;

        totaleFoto += 1;

        const numeroRilievo = String(i + 1).padStart(2, "0");
        const numeroFoto = String(j + 1).padStart(2, "0");
        const ambiente = nomeFileSicuro(rilievo.ambientePdf || rilievo.ambiente);
        const rif = rilievo.riferimento ? "_" + nomeFileSicuro(rilievo.riferimento) : "";
        const crit = nomeFileSicuro(testoCriticita(rilievo) || "criticita");

        zip.file(`${numeroRilievo}_${ambiente}${rif}_${crit}_foto_${numeroFoto}.jpg`, blob);
      }
    }

    if (totaleFoto === 0) {
      alert("Non ci sono foto da esportare.");
      return;
    }

    const contenuto = await zip.generateAsync({ type: "blob" });
    saveAs(contenuto, "foto-sopralluogo.zip");
  }

  async function cancellaTutto() {
    const conferma = window.confirm("Vuoi cancellare tutti i rilievi?");
    if (!conferma) return;

    for (const rilievo of rilievi) {
      const fotoIds = getFotoIds(rilievo);
      for (const id of fotoIds) {
        await cancellaFotoDB(id);
      }
    }

    setRilievi([]);
    localStorage.removeItem("rilieviSopralluogo");
  }

  function resetEmergenza() {
    localStorage.removeItem("rilieviSopralluogo");
    localStorage.removeItem("datiCondominio");

    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => window.location.reload();
    deleteRequest.onerror = () => window.location.reload();
    deleteRequest.onblocked = () => window.location.reload();
  }

  if (ambienteSelezionato) {
    const criticitaRapide = criticitaPerAmbiente[ambienteSelezionato] || [];

    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => setAmbienteSelezionato(null)}>
          ← Home
        </button>

        <h1 style={{ textAlign: "center" }}>{ambienteSelezionato}</h1>

        <input
          style={styles.input}
          placeholder="Riferimento / posizione es. Scala C, Piano -1..."
          value={riferimento}
          onChange={(e) => setRiferimento(e.target.value)}
        />

        <h2>Criticità</h2>

        {criticitaRapide.map((item) => {
          const selezionata = criticitaSelezionata === item;

          return (
            <button
              key={item}
              style={{
                ...styles.warningButton,
                backgroundColor: selezionata ? "#d32f2f" : "#eeeeee",
                color: selezionata ? "white" : "black",
                fontWeight: selezionata ? "bold" : "normal",
              }}
              onClick={() => setCriticitaSelezionata(item)}
            >
              {selezionata ? "✓ " : ""}
              {item}
            </button>
          );
        })}

        <label style={styles.bigButton}>
          📷 Aggiungi foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={caricaFoto}
            style={{ display: "none" }}
          />
        </label>

        {fotoPreviewList.length > 0 && (
          <div style={styles.photoGrid}>
            {fotoPreviewList.map((src, index) => (
              <div key={index} style={styles.photoBox}>
                <img src={src} alt={`Foto ${index + 1}`} style={styles.previewSmall} />
                <button style={styles.removePhotoButton} onClick={() => eliminaFotoTemporanea(index)}>
                  Elimina foto
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={styles.counterText}>Foto selezionate: {fotoPreviewList.length}</p>

        <textarea
          style={styles.textarea}
          placeholder="Nota..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        <button style={styles.saveButton} onClick={salvaRilievo}>
          💾 Salva criticità
        </button>

        <button style={styles.backButton} onClick={() => setAmbienteSelezionato(null)}>
          ← Torna alla Home
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={{ textAlign: "center" }}>Checklist Sopralluogo TEST</h1>

      <div style={styles.card}>
        <h2>Dati Condominio</h2>

        <input style={styles.input} placeholder="Indirizzo" value={datiCondominio.indirizzo} onChange={(e) => setDatiCondominio({ ...datiCondominio, indirizzo: e.target.value })} />
        <input style={styles.input} placeholder="Anno costruzione" value={datiCondominio.anno} onChange={(e) => setDatiCondominio({ ...datiCondominio, anno: e.target.value })} />
        <input style={styles.input} placeholder="Corpi fabbrica" value={datiCondominio.corpiFabbrica} onChange={(e) => setDatiCondominio({ ...datiCondominio, corpiFabbrica: e.target.value })} />
        <input style={styles.input} placeholder="Vani scala" value={datiCondominio.vaniScala} onChange={(e) => setDatiCondominio({ ...datiCondominio, vaniScala: e.target.value })} />
        <input style={styles.input} placeholder="Unità immobiliari" value={datiCondominio.unitaImmobiliari} onChange={(e) => setDatiCondominio({ ...datiCondominio, unitaImmobiliari: e.target.value })} />

        <h3>Presenze</h3>

        {PRESENZE.map((p) => (
          <label key={p.key} style={styles.checkboxLabel}>
            <input type="checkbox" checked={datiCondominio[p.key] === true} onChange={(e) => setDatiCondominio({ ...datiCondominio, [p.key]: e.target.checked })} />
            {p.label}
          </label>
        ))}
      </div>

      <div style={styles.grid}>
        {ambienti.map((ambiente) => (
          <button key={ambiente} style={styles.environmentButton} onClick={() => apriAmbiente(ambiente)}>
            {ambiente}
          </button>
        ))}
      </div>

      {rilievi.length > 0 && (
        <>
          <button style={styles.pdfButton} onClick={esportaPDF}>
            📄 Esporta PDF checklist
          </button>

          <button style={styles.zipButton} onClick={esportaFotoZip}>
            📦 Esporta foto ZIP
          </button>
        </>
      )}

      <h2 style={{ marginTop: "40px" }}>Rilievi salvati</h2>

      {rilievi.length > 0 && (
        <button style={styles.deleteAllButton} onClick={cancellaTutto}>
          🗑️ Cancella tutti
        </button>
      )}

      <button style={styles.resetButton} onClick={resetEmergenza}>
        ⚠️ Reset emergenza
      </button>

      {rilievi.map((rilievo, index) => (
        <div key={index} style={styles.card}>
          <h3>
            #{index + 1} - {rilievo.ambiente}
          </h3>
          <p>
            <strong>Riferimento:</strong> {rilievo.riferimento || "-"}
          </p>
          <p>
            <strong>Criticità:</strong> {testoCriticita(rilievo)}
          </p>
          <p>
            <strong>Nota:</strong> {rilievo.nota || "-"}
          </p>
          <p>
            <strong>Data/Ora:</strong> {rilievo.dataOra}
          </p>
          <p>
            <strong>Foto:</strong> {getFotoIds(rilievo).length}
          </p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  grid: {
    display: "grid",
    gap: "15px",
    marginTop: "30px",
  },
  environmentButton: {
    padding: "25px",
    fontSize: "22px",
    borderRadius: "15px",
    border: "none",
    backgroundColor: "#1e88e5",
    color: "white",
    fontWeight: "bold",
  },
  backButton: {
    width: "100%",
    padding: "14px",
    fontSize: "17px",
    borderRadius: "12px",
    border: "none",
    marginBottom: "15px",
  },
  bigButton: {
    display: "block",
    textAlign: "center",
    width: "100%",
    padding: "22px",
    fontSize: "22px",
    borderRadius: "15px",
    border: "none",
    backgroundColor: "#43a047",
    color: "white",
    fontWeight: "bold",
    marginTop: "20px",
    marginBottom: "15px",
    cursor: "pointer",
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "15px",
  },
  photoBox: {
    backgroundColor: "white",
    padding: "8px",
    borderRadius: "12px",
  },
  previewSmall: {
    width: "100%",
    height: "130px",
    objectFit: "cover",
    borderRadius: "10px",
  },
  removePhotoButton: {
    width: "100%",
    marginTop: "6px",
    padding: "8px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#c62828",
    color: "white",
  },
  counterText: {
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "15px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginBottom: "12px",
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    fontSize: "18px",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  warningButton: {
    width: "100%",
    padding: "18px",
    fontSize: "18px",
    borderRadius: "12px",
    border: "none",
    marginBottom: "10px",
  },
  saveButton: {
    width: "100%",
    padding: "22px",
    fontSize: "22px",
    borderRadius: "15px",
    border: "none",
    backgroundColor: "#fb8c00",
    color: "white",
    fontWeight: "bold",
    marginTop: "20px",
  },
  pdfButton: {
    width: "100%",
    padding: "20px",
    fontSize: "20px",
    borderRadius: "15px",
    border: "none",
    backgroundColor: "#5e35b1",
    color: "white",
    fontWeight: "bold",
    marginTop: "40px",
  },
  zipButton: {
    width: "100%",
    padding: "20px",
    fontSize: "20px",
    borderRadius: "15px",
    border: "none",
    backgroundColor: "#00897b",
    color: "white",
    fontWeight: "bold",
    marginTop: "15px",
  },
  card: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "15px",
    marginTop: "15px",
  },
  checkboxLabel: {
    display: "block",
    marginBottom: "10px",
    fontSize: "18px",
  },
  deleteAllButton: {
    width: "100%",
    padding: "15px",
    fontSize: "18px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#6d4c41",
    color: "white",
    fontWeight: "bold",
    marginBottom: "15px",
  },
  resetButton: {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#9e9e9e",
    color: "white",
    marginTop: "15px",
  },
};

export default App;
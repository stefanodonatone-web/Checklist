import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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

function App() {
  const [ambienteSelezionato, setAmbienteSelezionato] = useState(null);
  const [foto, setFoto] = useState(null);
  const [riferimento, setRiferimento] = useState("");
  const [criticitaSelezionate, setCriticitaSelezionate] = useState([]);
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
    try {
      localStorage.setItem("rilieviSopralluogo", JSON.stringify(rilievi));
    } catch {
      alert("Memoria piena: elimina qualche rilievo o esporta le foto.");
    }
  }, [rilievi]);

  const ambienti = [
    "🏢 Vano Scala",
    "🏠 Terrazza",
    "🚗 Autorimessa",
    "🛗 Ascensore",
    "⚡ Contatori",
    "🔥 Antincendio",
    "🧱 Fabbricato Esterno",
    "☣️ Amianto",
    "🧰 Cantine",
    "🏢 Portineria",
  ];

  const criticitaPerAmbiente = {
    "🏢 Vano Scala": [
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
    ],
    "🏠 Terrazza": [
      "Parapetto basso",
      "Antenna pericolante",
      "Guano piccioni",
      "Pavimento scivoloso",
      "Altro",
    ],
    "🚗 Autorimessa": [
      "Percorsi promiscui",
      "Estintore assente",
      "Porta tagliafuoco non funzionante",
      "Scatole elettriche aperte",
      "Altro",
    ],
    "🛗 Ascensore": [
      "Dislivello cabina/piano",
      "Assenza cartellonistica",
      "Illuminazione insufficiente",
      "Altro",
    ],
    "⚡ Contatori": [
      "Quadro elettrico aperto",
      "Scatole derivazione aperte",
      "Materiale combustibile presente",
      "Assenza segnale rischio elettrico",
      "Altro",
    ],
    "🔥 Antincendio": [
      "Estintore assente",
      "Estintore non revisionato",
      "Porta tagliafuoco non funzionante",
      "Idrante non accessibile",
      "Assenza cartellonistica",
      "Altro",
    ],
    "🧱 Fabbricato Esterno": [
      "Crepe su pareti",
      "Degrado intonaco esterno",
      "Elementi pericolanti",
      "Cedimento muro",
      "Vasi su davanzale",
      "Altro",
    ],
    "☣️ Amianto": [
      "Presunta presenza amianto",
      "Materiale deteriorato",
      "Necessaria verifica documentale",
      "Altro",
    ],
    "🧰 Cantine": [
      "Condizioni malsane",
      "Pavimento scivoloso",
      "Materiale accatastato",
      "Presenza FAV",
      "Altro",
    ],
    "🏢 Portineria": [
      "Mancanza servizi igienici",
      "Postazione non ergonomica",
      "Assenza estintore",
      "DPI mancanti",
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

          resolve(canvas.toDataURL("image/jpeg", 0.65));
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function caricaFoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fotoCompressa = await comprimiFoto(file);
    setFoto(fotoCompressa);
  }

  function apriAmbiente(ambiente) {
    setAmbienteSelezionato(ambiente);
    setFoto(null);
    setRiferimento("");
    setCriticitaSelezionate([]);
    setNota("");
  }

  function selezionaCriticita(item) {
    if (criticitaSelezionate.includes(item)) {
      setCriticitaSelezionate(criticitaSelezionate.filter((c) => c !== item));
    } else {
      setCriticitaSelezionate([...criticitaSelezionate, item]);
    }
  }

  function salvaRilievo() {
    const nuovoRilievo = {
      ambiente: ambienteSelezionato,
      ambientePdf: nomePulito(ambienteSelezionato),
      riferimento,
      criticita: criticitaSelezionate,
      nota,
      foto,
      dataOra: new Date().toLocaleString("it-IT"),
    };

    setRilievi([...rilievi, nuovoRilievo]);
    alert("Rilievo salvato!");

    setAmbienteSelezionato(null);
    setFoto(null);
    setRiferimento("");
    setCriticitaSelezionate([]);
    setNota("");
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
    doc.text("RILIEVI", 20, y);
    y += 10;

    rilievi.forEach((rilievo, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(`${index + 1}. ${rilievo.ambientePdf || nomePulito(rilievo.ambiente)}`, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.text(`Riferimento: ${rilievo.riferimento || "-"}`, 20, y);
      y += 7;

      const crit = doc.splitTextToSize(`Criticita: ${testoCriticita(rilievo)}`, 170);
      doc.text(crit, 20, y);
      y += crit.length * 6;

      const notaPdf = doc.splitTextToSize(`Nota: ${rilievo.nota || "-"}`, 170);
      doc.text(notaPdf, 20, y);
      y += notaPdf.length * 6;

      doc.text(`Data/Ora: ${rilievo.dataOra}`, 20, y);
      y += 14;
    });

    doc.save("checklist-condominio.pdf");
  }

  async function esportaFotoZip() {
    const rilieviConFoto = rilievi.filter((r) => r.foto);

    if (rilieviConFoto.length === 0) {
      alert("Non ci sono foto da esportare.");
      return;
    }

    const zip = new JSZip();

    for (let i = 0; i < rilieviConFoto.length; i++) {
      const rilievo = rilieviConFoto[i];
      const response = await fetch(rilievo.foto);
      const blob = await response.blob();

      const numero = String(i + 1).padStart(2, "0");
      const ambiente = nomeFileSicuro(rilievo.ambientePdf || rilievo.ambiente);
      const rif = rilievo.riferimento ? "_" + nomeFileSicuro(rilievo.riferimento) : "";
      const crit = nomeFileSicuro(testoCriticita(rilievo) || "criticita");

      zip.file(`${numero}_${ambiente}${rif}_${crit}.jpg`, blob);
    }

    const contenuto = await zip.generateAsync({ type: "blob" });
    saveAs(contenuto, "foto-sopralluogo.zip");
  }

  function cancellaTutto() {
    const conferma = window.confirm("Vuoi cancellare tutti i rilievi?");
    if (!conferma) return;
    setRilievi([]);
    localStorage.removeItem("rilieviSopralluogo");
  }

  function resetEmergenza() {
    localStorage.removeItem("rilieviSopralluogo");
    localStorage.removeItem("datiCondominio");
    window.location.reload();
  }

  if (ambienteSelezionato) {
    const criticitaRapide = criticitaPerAmbiente[ambienteSelezionato] || [];

    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => setAmbienteSelezionato(null)}>
          ← Indietro
        </button>

        <h1 style={{ textAlign: "center" }}>{ambienteSelezionato}</h1>

        <label style={styles.bigButton}>
          📷 Scatta / carica foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={caricaFoto}
            style={{ display: "none" }}
          />
        </label>

        {foto && <img src={foto} alt="Foto rilievo" style={styles.preview} />}

        <input
          style={styles.input}
          placeholder="Riferimento / posizione es. Scala C, Piano -1..."
          value={riferimento}
          onChange={(e) => setRiferimento(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Nota..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        <h2>Criticità rapide</h2>

        {criticitaRapide.map((item) => {
          const selezionata = criticitaSelezionate.includes(item);

          return (
            <button
              key={item}
              style={{
                ...styles.warningButton,
                backgroundColor: selezionata ? "#d32f2f" : "#eeeeee",
                color: selezionata ? "white" : "black",
                fontWeight: selezionata ? "bold" : "normal",
              }}
              onClick={() => selezionaCriticita(item)}
            >
              {selezionata ? "✓ " : ""}
              {item}
            </button>
          );
        })}

        <button style={styles.saveButton} onClick={salvaRilievo}>
          💾 Salva rilievo
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={{ textAlign: "center" }}>Checklist Sopralluogo</h1>

      <div style={styles.card}>
        <h2>Dati Condominio</h2>

        <input
          style={styles.input}
          placeholder="Indirizzo"
          value={datiCondominio.indirizzo}
          onChange={(e) => setDatiCondominio({ ...datiCondominio, indirizzo: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Anno costruzione"
          value={datiCondominio.anno}
          onChange={(e) => setDatiCondominio({ ...datiCondominio, anno: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Corpi fabbrica"
          value={datiCondominio.corpiFabbrica}
          onChange={(e) => setDatiCondominio({ ...datiCondominio, corpiFabbrica: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Vani scala"
          value={datiCondominio.vaniScala}
          onChange={(e) => setDatiCondominio({ ...datiCondominio, vaniScala: e.target.value })}
        />

        <input
          style={styles.input}
          placeholder="Unità immobiliari"
          value={datiCondominio.unitaImmobiliari}
          onChange={(e) => setDatiCondominio({ ...datiCondominio, unitaImmobiliari: e.target.value })}
        />

        <h3>Presenze</h3>

        {PRESENZE.map((p) => (
          <label key={p.key} style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={datiCondominio[p.key] === true}
              onChange={(e) =>
                setDatiCondominio({
                  ...datiCondominio,
                  [p.key]: e.target.checked,
                })
              }
            />
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
            <strong>Foto:</strong> {rilievo.foto ? "presente" : "assente"}
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
    padding: "12px",
    fontSize: "18px",
    marginBottom: "20px",
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
    marginBottom: "15px",
    cursor: "pointer",
  },
  preview: {
    width: "100%",
    maxHeight: "300px",
    objectFit: "cover",
    borderRadius: "15px",
    marginBottom: "15px",
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
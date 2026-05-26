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

const CHECKLIST_GESTIONALE = [
  {
    titolo: "TERRAZZA CONDOMINIALE",
    voci: [
      "ACCESSO DIFFICOLTOSO",
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "ANTENNA DIVELTA A TERRA",
      "ANTENNA PERICOLANTE",
      "ASSENZA PARAPETTO",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DEGRADO INTONACO ESTERNO",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "GUANO PICCIONE",
      "MATERIALE ACCATASTATO",
      "PARAPETTO < 1m",
      "PARAPETTO SCALABILE",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERA DIVELTA",
      "SCALA ACCESSO TORRINO NON CONF.",
      "VASI DAVANZALI",
    ],
  },
  {
    titolo: "LOCALE LAVATOIO",
    voci: [
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "ANTENNA DIVELTA A TERRA",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "SCATOLE DER. APERTE",
    ],
  },
  {
    titolo: "SOFFITTE",
    voci: [
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "SCATOLE DER. APERTE",
    ],
  },
  {
    titolo: "FINESTRE CONDOMINIALI",
    voci: [
      "INFISSI VETUSTI/VETRI DANNEGGIATI",
      "PARAPETTO < 1m",
      "PARAPETTO SCALABILE",
    ],
  },
  {
    titolo: "VANO SCALA CONDOMINIALE",
    voci: [
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "ASSENZA PARAPETTO",
      "ASSENZA CORRIMANO",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "GRADINO ROTTO",
      "GUANO PICCIONE",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "INFISSI VETUSTI/VETRI DANNEGGIATI",
      "MATERIALE ACCATASTATO",
      "PARAPETTO < 1m",
      "PARAPETTO SCALABILE",
      "PASSAGGI RISTRETTI",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
    ],
  },
  {
    titolo: "IMPIANTO ASCENSORE",
    voci: [
      "ASSENZA DI CARTELLONISTICA",
      "DISLIVELLO",
      "SCATOLA CHIAVE MANOMESSA",
      "SCAT PULS SGANCIO EL ROTTA",
    ],
  },
  {
    titolo: "CONTATORI ELETTRICI",
    voci: [
      "ASSENZA DI CARTELLONISTICA",
      "ASSENZA SEGNALE RISCHIO ELETTRICO",
      "CONTATORI NON PROTETTI / NON SEGREGATI",
      "SCATOLE DER. APERTE",
    ],
  },
  {
    titolo: "CANTINE",
    voci: [
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "ASSENZA CORRIMANO",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "PRESENZA FAV",
      "SCATOLE DER. APERTE",
    ],
  },
  {
    titolo: "CHIOSTRINA CONDOMINIALE",
    voci: [
      "ACCESSO DIFFICOLTOSO",
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "PRESENZA FAV",
      "SCATOLE DER. APERTE",
      "VASI DAVANZALI",
    ],
  },
  {
    titolo: "AUTORIMESSA",
    voci: [
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "ASSENZA CORRIMANO",
      "ASSENZA DI CARTELLONISTICA",
      "ASSENZA DI PROTEZIONE",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "INFISSI VETUSTI/VETRI DANNEGGIATI",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "PERCORSI PROMISCUI AUTO/PERS",
      "PRESENZA FAV",
      "PULS. SGANCIO CARTELLONISTICA",
      "SCALA DANNEGGIATA",
      "SCATOLE DER. APERTE",
    ],
  },
  {
    titolo: "FABBRICATO ESTERNO",
    voci: [
      "CANTIERE PRESENTE",
      "CEDIMENTO MURO DI SOSTEGNO",
      "CREPE SU PARETI",
      "DEGRADO INTONACO ESTERNO",
      "MESSA IN SICUREZZA",
      "VASI SU DAVANZALE",
    ],
  },
  {
    titolo: "CALDAIA CONDOMINIALE",
    voci: [
      "ASSENZA DI CORRIMANO",
      "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
      "CARTELLO VALVOLA E INTERRUTORE GENERALE",
      "CONDIZIONI MALSANE",
      "CREPE",
      "DISLIVELLO/GRADINO NON SEGNALATO",
      "INFILTRAZIONI/DISTACCO INTONACO",
      "MATERIALE ACCATASTATO",
      "PAVIMENTO SCIVOLOSO",
      "PAVIMENTAZIONE SCONNESSA",
      "PLAFONIERE DIVELTE",
      "PRESENZA FAV",
      "SCATOLE DER. APERTE",
      "TUBAZIONE GAS (GIALLO)",
    ],
  },
  {
    titolo: "DISPOSITIVI E IMPIANTI ANTINCENDIO",
    voci: [
      "ASSENZA ESTINTORE",
      "MANUTENZIONE SCADUTA",
      "PORTA TAGLIAFUOCO NON FUNZIONANTE",
      "SCARSA VISIBILITA'",
      "TUBAZIONE IDRANTE (ROSSA)",
    ],
  },
  {
    titolo: "AMIANTO",
    voci: [
      "PRESUNTA PRESENZA DI AMIANTO",
      "PRESENZA CERTIFICATA DI AMIANTO",
    ],
  },
];

function App() {
  const [ambienteSelezionato, setAmbienteSelezionato] = useState(null);
  const [fotoBlobList, setFotoBlobList] = useState([]);
  const [fotoPreviewList, setFotoPreviewList] = useState([]);
  const [riferimento, setRiferimento] = useState("");
  const [criticitaSelezionata, setCriticitaSelezionata] = useState("");
  const [showExtraCriticita, setShowExtraCriticita] = useState(false);
  const [nota, setNota] = useState("");
  const [showDati, setShowDati] = useState(true);

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
    "🏠 Terrazza condominiale": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "ANTENNA DIVELTA A TERRA",
        "ANTENNA PERICOLANTE",
        "ASSENZA PARAPETTO",
        "DEGRADO INTONACO ESTERNO",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "MATERIALE ACCATASTATO",
        "PARAPETTO <1m",
        "PARAPETTO SCALABILE",
        "PLAFONIERA DIVELTA",
        "SCALA ACCESSO TORRINO NON CONF.",
      ],

      altre: [
        "ACCESSO DIFFICOLTOSO",
        "CONDIZIONI MALSANE",
        "CREPE",
        "GUANO PICCIONE",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
        "VASI DAVANZALI",
      ],
    },
    "🧺 Locale lavatoio": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "MATERIALE ACCATASTATO",
        "PLAFONIERE DIVELTE",
        "SCATOLE DER. APERTE",
      ],

      altre: [
        "ANTENNA DIVELTA A TERRA",
        "CONDIZIONI MALSANE",
        "CREPE",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
      ],
    },
    "🏚️ Soffitte": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "MATERIALE ACCATASTATO",
        "PLAFONIERE DIVELTE",
        "SCATOLE DER. APERTE",
      ],

      altre: [
        "CONDIZIONI MALSANE",
        "CREPE",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
      ],
    },
    "🪟 Finestre condominiali": [
      "Infissi vetusti/vetri danneggiati",
      "Parapetto < 1m",
      "Parapetto scalabile",
      "Altro",
    ],
    "🏢 Vano scala condominiale": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "ASSENZA CORRIMANO",
        "GRADINO ROTTO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "INFISSI VETUSTI/VETRI DANNEGGIATI",
        "MATERIALE ACCATASTATO",
        "PARAPETTO <1m",
        "PASSAGGI RISTRETTI",
        "PLAFONIERE DIVELTE",
      ],

      altre: [
        "ASSENZA PARAPETTO",
        "CREPE",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "GUANO PICCIONE",
        "PARAPETTO SCALABILE",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
      ],
    },
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
    "🧰 Cantine": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "MATERIALE ACCATASTATO",
        "PAVIMENTAZIONE SCONNESSA",
        "PLAFONIERE DIVELTE",
        "PRESENZA FAV",
        "SCATOLE DER. APERTE",
      ],

      altre: [
        "ASSENZA CORRIMANO",
        "CONDIZIONI MALSANE",
        "CREPE",
        "PAVIMENTO SCIVOLOSO",
      ],
    },
    "🏙️ Chiostrina condominiale": {
      principali: [
        "ACCESSO DIFFICOLTOSO",
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "MATERIALE ACCATASTATO",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
        "VASI DAVANZALI",
      ],

      altre: [
        "CONDIZIONI MALSANE",
        "CREPE",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "PLAFONIERE DIVELTE",
        "PRESENZA FAV",
        "SCATOLE DER. APERTE",
      ],
    },
    "🚗 Autorimessa": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "ASSENZA DI CARTELLONISTICA",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "MATERIALE ACCATASTATO",
        "PAVIMENTAZIONE SCONNESSA",
        "PLAFONIERE DIVELTE",
        "PERCORSI PROMISCUI AUTO/PERS",
        "PRESENZA FAV",
        "PULS. SGANCIO CARTELLONISTICA",
        "SCATOLE DER. APERTE",
      ],

      altre: [
        "ASSENZA CORRIMANO",
        "ASSENZA DI PROTEZIONE",
        "CONDIZIONI MALSANE",
        "CREPE",
        "INFISSI VETUSTI/VETRI DANNEGGIATI",
        "PAVIMENTO SCIVOLOSO",
        "SCALA DANNEGGIATA",
      ],
    },
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
    "🔥 Caldaia condominiale": {
      principali: [
        "ALTEZZA RIDOTTA/FILO ALTEZZA UOMO",
        "CARTELLO VALVOLA E INTERRUTORE GENERALE",
        "DISLIVELLO/GRADINO NON SEGNALATO",
        "INFILTRAZIONI/DISTACCO INTONACO",
        "MATERIALE ACCATASTATO",
        "PLAFONIERE DIVELTE",
        "PRESENZA FAV",
        "SCATOLE DER. APERTE",
        "TUBAZIONE GAS (GIALLO)",
      ],

      altre: [
        "ASSENZA DI CORRIMANO",
        "CONDIZIONI MALSANE",
        "CREPE",
        "PAVIMENTO SCIVOLOSO",
        "PAVIMENTAZIONE SCONNESSA",
      ],
    },
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

  function riapriRilievo(rilievo) {
    setAmbienteSelezionato(rilievo.ambiente);
    setCriticitaSelezionata(testoCriticita(rilievo));
    setRiferimento("");
    setNota("");
    setFotoBlobList([]);
    setFotoPreviewList([]);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
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

    const indiceEsistente = rilievi.findIndex(
      (r) =>
        r.ambiente === ambienteSelezionato &&
        testoCriticita(r) === criticitaSelezionata
    );

    if (indiceEsistente !== -1) {
      const rilieviAggiornati = [...rilievi];
      const rilievoEsistente = { ...rilieviAggiornati[indiceEsistente] };

      rilievoEsistente.fotoIds = [
        ...getFotoIds(rilievoEsistente),
        ...fotoIds,
      ];

      const riferimentiEsistenti = rilievoEsistente.riferimento
        ? rilievoEsistente.riferimento.split(" | ")
        : [];

      if (riferimento && !riferimentiEsistenti.includes(riferimento)) {
        riferimentiEsistenti.push(riferimento);
      }

      rilievoEsistente.riferimento = riferimentiEsistenti.join(" | ");

      if (nota) {
        rilievoEsistente.nota = rilievoEsistente.nota
          ? rilievoEsistente.nota + "\n" + nota
          : nota;
      }

      rilieviAggiornati[indiceEsistente] = rilievoEsistente;
      setRilievi(rilieviAggiornati);
    } else {
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
    }
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

      const rilieviAmbienteOrdinati = [...rilieviAmbiente].sort((a, b) => {
        const ordineCriticita = criticitaPerAmbiente[ambiente] || [];

        const indiceA = ordineCriticita.indexOf(testoCriticita(a));
        const indiceB = ordineCriticita.indexOf(testoCriticita(b));

        const ordineA = indiceA === -1 ? 9999 : indiceA;
        const ordineB = indiceB === -1 ? 9999 : indiceB;

        return ordineA - ordineB;
      });

      rilieviAmbienteOrdinati.forEach((rilievo) => {
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

  function normalizzaConfronto(testo) {
    return String(testo || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[.,'’()/\\-]/g, "")
      .replace(/</g, "MINORE")
      .replace(/>/g, "MAGGIORE");
  }

  function esportaPDFGestionale() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Checklist formato gestionale", 20, 20);

    let y = 35;

    doc.setFontSize(10);
    doc.text(`Indirizzo: ${datiCondominio.indirizzo || "-"}`, 20, y);
    y += 7;

    doc.text(`Data export: ${new Date().toLocaleString("it-IT")}`, 20, y);
    y += 12;

    CHECKLIST_GESTIONALE.forEach((sezione) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(sezione.titolo, 20, y);
      y += 8;

      sezione.voci.forEach((voce) => {
        const trovati = rilievi.filter((rilievo) => {
          const ambienteRilievo = normalizzaConfronto(
            rilievo.ambientePdf || rilievo.ambiente
          );

          const ambienteChecklist = normalizzaConfronto(sezione.titolo);
          const criticitaRilievo = normalizzaConfronto(testoCriticita(rilievo));
          const criticitaChecklist = normalizzaConfronto(voce);

          return (
            ambienteRilievo === ambienteChecklist &&
            criticitaRilievo === criticitaChecklist
          );
        });

        const presente = trovati.length > 0;

        const riferimenti = [
          ...new Set(
            trovati
              .flatMap((r) => String(r.riferimento || "").split(" | "))
              .map((r) => r.trim())
              .filter(Boolean)
          ),
        ];

        if (presente) {
  doc.setTextColor(220, 0, 0);
  doc.setFontSize(13);

  doc.text("X", 24, y);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  doc.text(voce, 32, y);
} else {
  doc.setFontSize(11);
  doc.text("[ ] " + voce, 24, y);
}

        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        y += 6;

        if (presente) {
          if (riferimenti.length > 0) {
            const rifText = doc.splitTextToSize(
              `Rif: ${riferimenti.join(" | ")}`,
              165
            );
            doc.text(rifText, 32, y);
            y += rifText.length * 5;
          }

        }

        y += 2;
      });

      y += 5;
    });

    doc.save("checklist-formato-gestionale.pdf");
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
    const criticitaData =
      criticitaPerAmbiente[ambienteSelezionato] || {};

    const criticitaRapide = Array.isArray(criticitaData)
      ? criticitaData
      : criticitaData.principali || [];

    const criticitaExtra = Array.isArray(criticitaData)
      ? []
      : criticitaData.altre || [];

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

        <div style={styles.criticitaGrid}>
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
                onClick={() => {
                  setCriticitaSelezionata(item);

                  setTimeout(() => {
                    document.getElementById("inputFoto")?.click();
                  }, 150);
                }}
              >
                {selezionata ? "✓ " : ""}
                {item}
              </button>
            );
          })}
        </div>

        {criticitaExtra.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <button
              style={styles.resetButton}
              onClick={() => setShowExtraCriticita(!showExtraCriticita)}
            >
              {showExtraCriticita
                ? "▲ Nascondi altre criticità"
                : "▼ Altre criticità"}
            </button>

            {showExtraCriticita && (
              <div style={styles.criticitaGrid}>
                {criticitaExtra.map((item) => {
                  const selezionata = criticitaSelezionata === item;

                  return (
                    <button
                      key={item}
                      style={{
                        ...styles.warningButton,
                        backgroundColor: selezionata
                          ? "#d32f2f"
                          : "#eeeeee",
                        color: selezionata ? "white" : "black",
                        fontWeight: selezionata ? "bold" : "normal",
                      }}
                      onClick={() => {
                        setCriticitaSelezionata(item);

                        setTimeout(() => {
                          document
                            .getElementById("inputFoto")
                            ?.click();
                        }, 150);
                      }}
                    >
                      {selezionata ? "✓ " : ""}
                      {item}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <label style={styles.bigButton}>
          📷 Aggiungi foto
          <input
            id="inputFoto"
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
      <h1 style={{ textAlign: "center" }}>CHECKLIST TEST MODIFICATA</h1>

      <div style={styles.card}>
        <h2
          style={{ cursor: "pointer" }}
          onClick={() => setShowDati(!showDati)}
        >
          {showDati ? "▼" : "▶"} Dati Condominio
        </h2>
        {showDati && (
          <>

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
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "10px",
          marginTop: "20px",
          width: "100%",
        }}
      >
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

          <button style={styles.pdfButton} onClick={esportaPDFGestionale}>
            📋 Esporta PDF formato gestionale
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
        <div
          key={index}
          style={{ ...styles.card, cursor: "pointer" }}
          onClick={() => riapriRilievo(rilievo)}
        >
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
          <p style={{ fontSize: "14px", opacity: 0.7 }}>
            Tocca per aggiungere foto o riferimenti
          </p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: "10px",
    fontFamily: "Arial",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "20px",
    width: "100%",
  },
  criticitaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "15px",
  },
  environmentButton: {
    width: "100%",
    minHeight: "unset",
    padding: "10px 6px",
    fontSize: "13px",
    lineHeight: "1.1",
    whiteSpace: "normal",
    borderRadius: "12px",
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
    minHeight: "unset",
    padding: "10px 8px",
    fontSize: "13px",
    lineHeight: "1.15",
    whiteSpace: "normal",
    borderRadius: "10px",
    border: "none",
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
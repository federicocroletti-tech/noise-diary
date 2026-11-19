import { NoiseEventType } from './noise-event.model';

export interface NoiseActionSuggestion {
  title: string;
  summary: string;
  steps: readonly string[];
}

export const NOISE_ACTION_DISCLAIMER =
  'Suggerimento generico e non vincolante: non è un parere legale né una procedura obbligatoria. Valuta sempre la situazione concreta.';

const SUGGESTIONS: Record<NoiseEventType, NoiseActionSuggestion> = {
  HUM: {
    title: 'Ronzio continuo',
    summary: 'Un ronzio costante spesso proviene da impianti, ventilazione o apparecchi in funzione.',
    steps: [
      'Annota se il rumore cessa spegnendo ventilazione, frigorifero o altri apparecchi.',
      'Registra un rumore di fondo in orari diversi per confrontarlo.',
      'Se persiste, valuta una verifica tecnica o una misura da parte di un professionista.',
    ],
  },
  VIBRATION: {
    title: 'Vibrazione',
    summary: "Le vibrazioni possono essere trasmesse dalla struttura dell'edificio o da macchinari vicini.",
    steps: [
      'Annota quando la vibrazione è percepita e cosa era in funzione.',
      "Chiedi all'amministrazione o al gestore dell'edificio se impianti o macchinari sono noti.",
      'Per una valutazione tecnica, considera un professionista competente.',
    ],
  },
  IMPACT: {
    title: 'Impatti e colpi',
    summary: 'Urti ripetuti o calpestio sono spesso legati alle abitudini quotidiane dei vicini.',
    steps: [
      'Annota orari, frequenza e durata degli episodi.',
      'Valuta un contatto informale e cortese con il vicino interessato.',
      'Se il problema continua, considera una comunicazione scritta.',
    ],
  },
  DRAGGING: {
    title: 'Trascinamento di oggetti',
    summary: 'Lo spostamento di mobili o oggetti pesanti è un rumore spesso risolvibile con un accordo.',
    steps: [
      'Annota orari e tipo di oggetti trascinati, se noti.',
      'Chiedi un confronto diretto e cortese, proponendo orari più tranquilli.',
      'Se la situazione non migliora, valuta una comunicazione scritta.',
    ],
  },
  MUSIC: {
    title: 'Musica',
    summary: 'La musica ad alto volume è spesso risolvibile con un confronto diretto.',
    steps: [
      'Annota orari, volume percepito e durata.',
      'Valuta un contatto informale proponendo fasce orarie condivise.',
      'Se persiste, considera una comunicazione scritta e le indicazioni del regolamento locale.',
    ],
  },
  VOICES: {
    title: 'Voci',
    summary: 'Le voci possono provenire da conversazioni, ambienti condivisi o spazi esterni.',
    steps: [
      'Annota orari e frequenza senza registrare conversazioni private non necessarie.',
      'Valuta un contatto informale, evitando accuse.',
      'Se il disturbo continua, considera una comunicazione scritta.',
    ],
  },
  SYSTEM: {
    title: 'Impianto',
    summary: 'Rumori da impianti idraulici, di riscaldamento o di scarico spesso hanno origine tecnica.',
    steps: [
      "Annota quando il rumore si presenta e se coincide con l'uso di acqua o riscaldamento.",
      "Segnala il problema all'amministrazione o al manutentore dell'impianto.",
      'Conserva le segnalazioni inviate e le risposte ricevute.',
    ],
  },
  APPLIANCE: {
    title: 'Elettrodomestico',
    summary: 'Gli elettrodomestici possono generare rumori per usura o cattiva installazione.',
    steps: [
      "Annota quale apparecchio sembra la sorgente e in quali orari.",
      "Verifica se il rumore cessa spegnendo l'apparecchio, se è sicuro farlo.",
      'Se la sorgente è in un altro appartamento, valuta un contatto informale con il proprietario.',
    ],
  },
  TRAFFIC: {
    title: 'Traffico',
    summary: 'Il traffico veicolare è spesso una fonte esterna difficile da risolvere con un singolo vicino.',
    steps: [
      'Annota orari, tipologia di veicoli e frequenza degli episodi.',
      'Raccogli eventuali segnalazioni simili di altri residenti.',
      "Per un intervento, rivolgiti all'ente locale competente.",
    ],
  },
  UNKNOWN: {
    title: 'Sorgente non identificata',
    summary: 'Quando la sorgente non è chiara, la priorità è documentare meglio gli episodi.',
    steps: [
      "Registra l'audio di fondo in momenti diversi per individuare schemi ricorrenti.",
      'Annota dove ti trovi e cosa senti meglio, con note brevi e neutrali.',
      'Quando la sorgente è più chiara, aggiorna il tipo di evento.',
    ],
  },
  OTHER: {
    title: 'Altro rumore',
    summary: 'Per rumori che non rientrano nelle categorie previste, la descrizione dettagliata è fondamentale.',
    steps: [
      'Descrivi il rumore nelle note con il maggior dettaglio possibile.',
      'Annota orari, durata e frequenza.',
      'Se il disturbo è rilevante, valuta un professionista competente.',
    ],
  },
};

export function suggestNoiseAction(eventType: NoiseEventType): NoiseActionSuggestion {
  return SUGGESTIONS[eventType];
}

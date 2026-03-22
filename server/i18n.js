// Server-side i18n for API error messages and CSV export
const messages = {
  it: {
    missingCredentials: 'Username e password sono obbligatori',
    invalidCredentials: 'Credenziali non valide',
    demoNotConfigured: 'Modalità demo non configurata',
    passwordRequired: 'Password obbligatoria',
    invalidDemoPassword: 'Password demo non valida',
    missingToken: 'Token mancante',
    adminOnly: 'Accesso riservato agli admin',
    invalidToken: 'Token non valido o scaduto',
    unauthorized: 'Accesso non autorizzato',
    sessionNameRequired: 'Il nome della sessione è obbligatorio',
    sessionNotFound: 'Sessione non trovata',
    sessionCannotStart: 'La sessione non può essere avviata dallo stato attuale',
    sessionNotActive: 'La sessione non è attiva',
    sessionCodeAndTeamRequired: 'Codice sessione e nome squadra sono obbligatori',
    sessionNotFoundCheckCode: 'Sessione non trovata. Controlla il codice!',
    sessionAlreadyEnded: 'Questa sessione è già terminata',
    teamNameTaken: 'Nome squadra già in uso in questa sessione',
    incompleteData: 'Dati incompleti',
    teamNotFound: 'Squadra non trovata in questa sessione',
    alreadyAnswered: 'Hai già risposto a questa domanda',
    tooManyAttempts: 'Troppi tentativi. Riprova tra un minuto.',
    tooManyRequests: 'Troppe richieste. Riprova tra poco.',
    // CSV headers
    csvTeam: 'Squadra',
    csvGame: 'Gioco',
    csvQuestion: 'Domanda',
    csvAnswer: 'Risposta',
    csvCorrect: 'Corretto',
    csvPoints: 'Punti',
    csvDate: 'Data',
    csvYes: 'Sì',
    csvNo: 'No',
    csvFilename: 'risultati',
  },
  en: {
    missingCredentials: 'Username and password are required',
    invalidCredentials: 'Invalid credentials',
    demoNotConfigured: 'Demo mode not configured',
    passwordRequired: 'Password is required',
    invalidDemoPassword: 'Invalid demo password',
    missingToken: 'Missing token',
    adminOnly: 'Admin access only',
    invalidToken: 'Invalid or expired token',
    unauthorized: 'Unauthorized access',
    sessionNameRequired: 'Session name is required',
    sessionNotFound: 'Session not found',
    sessionCannotStart: 'Session cannot be started from its current state',
    sessionNotActive: 'Session is not active',
    sessionCodeAndTeamRequired: 'Session code and team name are required',
    sessionNotFoundCheckCode: 'Session not found. Check the code!',
    sessionAlreadyEnded: 'This session has already ended',
    teamNameTaken: 'Team name already in use in this session',
    incompleteData: 'Incomplete data',
    teamNotFound: 'Team not found in this session',
    alreadyAnswered: 'You have already answered this question',
    tooManyAttempts: 'Too many attempts. Try again in a minute.',
    tooManyRequests: 'Too many requests. Try again shortly.',
    // CSV headers
    csvTeam: 'Team',
    csvGame: 'Game',
    csvQuestion: 'Question',
    csvAnswer: 'Answer',
    csvCorrect: 'Correct',
    csvPoints: 'Points',
    csvDate: 'Date',
    csvYes: 'Yes',
    csvNo: 'No',
    csvFilename: 'results',
  },
};

const DEFAULT_LANG = 'it';

// Extract language from Accept-Language header
function getLang(req) {
  const accept = req?.headers?.['accept-language'] || '';
  if (accept.startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

// Get a translated message
function msg(req, key) {
  const lang = getLang(req);
  return (messages[lang] && messages[lang][key]) || messages[DEFAULT_LANG][key] || key;
}

module.exports = { getLang, msg, messages };

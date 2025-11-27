/*
Node.js script to create 6 Google Forms (one per week) using the Google Forms API via googleapis.

Usage:
1. npm install googleapis open readline-sync
2. Create OAuth client credentials in Google Cloud Console (OAuth Client ID -> Desktop app) and download as credentials.json
3. Enable the "Google Forms API" and "Google Drive API" for your project in Cloud Console.
4. Run: node create_forms_node.js
   - On first run the script will print an authorization URL. Paste it into your browser, sign in and paste the code back into the terminal.
   - The script saves tokens to token.json for subsequent runs.

Notes:
- The Forms REST API is evolving; the request body shape may change. If the API responds with an error, the error message will hint required adjustments.
- This script is a convenience tool. If you prefer, use the Apps Script variant which runs inside your Google account without extra OAuth setup.
*/

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

function askQuestion(query){
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function authorize(){
  if (!fs.existsSync(CREDENTIALS_PATH)){
    console.error('Missing credentials.json. Create OAuth2 client credentials (Desktop) in Google Cloud Console and save as tools/credentials.json');
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)){
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('Authorize this app by visiting this url:', authUrl);
  const code = await askQuestion('Enter the code from that page here: ');
  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('Token saved to', TOKEN_PATH);
  return oAuth2Client;
}

// Quiz definitions (same as other scripts)
const QUIZZES = [
  { week:1, titleSuffix:'Greetings', questions:[
    { q:'How do you say "hello" formally?', choices:['Hola','Hello','Goodbye','Please'], correct:1 },
    { q:'Which phrase is a greeting?', choices:['Thank you','How are you?','Good night','See you later'], correct:1 },
    { q:'"Nice to meet you" is used when:', choices:['Saying goodbye','Meeting someone new','Asking price','Ordering food'], correct:1 },
    { q:'Polite response to "How are you?"', choices:['I am fine, thank you','Go away','No idea','Maybe later'], correct:0 },
    { q:'Which is a greeting in the morning?', choices:['Good evening','Good morning','Good night','See you'], correct:1 }
  ]},
  { week:2, titleSuffix:'Listening & Phrases', questions:[
    { q:'How do you say please?', choices:['Gracias','Por favor','De nada','Lo siento'], correct:1 },
    { q:'Which means "thank you"?', choices:['Please','Thank you','Sorry','Hello'], correct:1 },
    { q:'"Excuse me" is used to:', choices:['Get attention','Say goodbye','Order food','Laugh'], correct:0 },
    { q:'Polite way to ask for something?', choices:['Give me','Please could I have','Shut up','Take it'], correct:1 },
    { q:'Which is an apology?', choices:['Thank you','Excuse me','I am sorry','Goodbye'], correct:2 }
  ]},
  { week:3, titleSuffix:'Everyday Questions', questions:[
    { q:'Which question asks for a location?', choices:['How are you?','Where is the market?','Can I help?','Goodbye'], correct:1 },
    { q:'"How much does this cost?" asks about:', choices:['Time','Price','Name','Location'], correct:1 },
    { q:'If someone asks "Which way?", they want to know:', choices:['Price','Direction','Time','Name'], correct:1 },
    { q:'Left in the local language is often:', choices:['Izquierda','Derecha','Arriba','Abajo'], correct:0 },
    { q:'To ask for the bathroom you might say:', choices:['Where is the bathroom?','What time?','How old are you?','See you later'], correct:0 }
  ]},
  { week:4, titleSuffix:'Transactions', questions:[
    { q:'A receipt is given after you:', choices:['Ask a question','Pay for an item','Say hello','Leave a message'], correct:1 },
    { q:'"Keep the change" means:', choices:['Return money','Keep extra money','Ask for change','Pay later'], correct:1 },
    { q:'When giving price info you should be:', choices:['Rude','Clear and loud','Unclear','Silent'], correct:1 },
    { q:'If a customer asks for a refund, you should:', choices:['Ignore them','Help and listen','Argue','Walk away'], correct:1 },
    { q:'A transaction typically involves:', choices:['Conversation only','Exchange of goods and money','Only greetings','Singing'], correct:1 }
  ]},
  { week:5, titleSuffix:'Asking for Help', questions:[
    { q:'To ask for help, you might say:', choices:['I need help','I am fine','Good night','How are you'], correct:0 },
    { q:'"Can you" is used to:', choices:['Give orders','Ask politely','Say no','Apologize'], correct:1 },
    { q:'If you are lost, you should say:', choices:['I am lost','I am happy','I am tired','I agree'], correct:0 },
    { q:'When asking permission, use:', choices:['May I?','Leave now','Don’t go','Stop'], correct:0 },
    { q:'A polite request often starts with:', choices:['Shut up','Please','Never','Now'], correct:1 }
  ]},
  { week:6, titleSuffix:'Safety & Closing', questions:[
    { q:'If there is danger, you should say:', choices:['Danger','Hello','Thank you','See you'], correct:0 },
    { q:'A phrase to ask someone to stop:', choices:['Stop please','Go away','Come in','Sit down'], correct:0 },
    { q:'In an emergency, call:', choices:['A friend','The emergency number','Nobody','The store'], correct:1 },
    { q:'To slow down a vehicle you might say:', choices:['Speed up','Slow down','Run','Jump'], correct:1 },
    { q:'“Safety first” emphasizes:', choices:['Fun','Careful behaviour','Hurry','Ignore rules'], correct:1 }
  ]}
];

async function run(){
  const auth = await authorize();
  const forms = google.forms({ version: 'v1', auth });

  const created = [];

  for (const def of QUIZZES){
    const title = `Week ${def.week} Quiz — English: ${def.titleSuffix}`;
    console.log('Creating:', title);

    // Build items in Forms API shape. The Forms API expects a list of item objects.
    // NOTE: If the API complains, check the latest request schema at https://developers.google.com/forms/api/reference/rest
    const items = def.questions.map(q => ({
      questionItem: {
        question: {
          required: true,
          choiceQuestion: {
            type: 'RADIO',
            options: q.choices.map(opt => ({ value: opt }))
          }
        }
      }
    }));

    const requestBody = {
      info: { title },
      items
    };

    try{
      const res = await forms.forms.create({ requestBody });
      const form = res.data;
      created.push({ week: def.week, title, form });
      console.log('Created form:', form.formId || form.revisionId || '(id not returned)');
      // The Forms API may not directly expose a published URL — use the Forms editor link if provided or construct from formId
      const formId = form.formId || (form.revisionId ? form.revisionId : null);
      if (formId) console.log('Editor URL: https://docs.google.com/forms/d/' + formId + '/edit');
    }catch(err){
      console.error('Failed to create form', title, err.errors || err.message || err);
      // continue
    }
  }

  console.log('Done. Created', created.length, 'forms.');
}

run().catch(err => console.error(err));

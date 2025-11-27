// Apps Script: create weekly quizzes, write URLs to a Sheet, set a confirmation message, and email the spreadsheet link.
function createWeeklyQuizzesAndSaveToSheetWithEmail() {
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

  const created = [];
  QUIZZES.forEach(def => {
    const title = `Week ${def.week} Quiz — English: ${def.titleSuffix}`;
    const form = FormApp.create(title);
    try{ form.setIsQuiz(true); }catch(e){ Logger.log('setIsQuiz not available: '+e.message); }
    form.setDescription('Short five-question quiz. Passing score: 4/5.');

    def.questions.forEach(q => {
      const item = form.addMultipleChoiceItem();
      item.setTitle(q.q).setRequired(true);
      const choices = q.choices.map((opt, i) => item.createChoice(opt, i === q.correct));
      item.setChoices(choices);
      try{ if (typeof item.setPoints === 'function') item.setPoints(1); }catch(e){ Logger.log('setPoints not available'); }
    });

    // Set a custom confirmation message that tells learners to return to the dashboard
    try{ form.setConfirmationMessage('Thanks — your response was recorded. Return to the dashboard to mark this module as complete.'); }catch(e){ Logger.log('setConfirmationMessage not available: '+e.message); }

    created.push({ week: def.week, title, editUrl: form.getEditUrl(), publishedUrl: form.getPublishedUrl() });
  });

  // write results to a Spreadsheet
  const ss = SpreadsheetApp.create('Puente Quiz Forms - ' + (new Date()).toISOString().slice(0,10));
  const sh = ss.getActiveSheet();
  sh.appendRow(['Week','Form Title','Edit URL','Published URL']);
  created.forEach(r => sh.appendRow([r.week, r.title, r.editUrl, r.publishedUrl]));

  // attempt to email the spreadsheet link to the script runner (effective user)
  const recipient = Session.getEffectiveUser && Session.getEffectiveUser().getEmail ? Session.getEffectiveUser().getEmail() : null;
  const message = 'Created forms and saved links to: ' + ss.getUrl();
  if (recipient){
    try{ MailApp.sendEmail(recipient, 'Puente Quiz Forms Created', message); }catch(e){ Logger.log('Failed to email: '+e.message); }
  }

  Logger.log('Created forms and wrote to sheet: %s', ss.getUrl());
  return { spreadsheetUrl: ss.getUrl(), forms: created };
}

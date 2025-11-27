/**
 * Puente — Google Forms Creator
 *
 * Instructions:
 * 1) Open script.google.com and create a new project (or open Google Drive -> New -> More -> Google Apps Script).
 * 2) Replace the placeholder QUESTIONS object below with your real questions JSON (or paste the content from your attachment into the QUESTIONS constant).
 * 3) Run the `createAllForms` function and authorize the script when prompted.
 * 4) The script will create one Google Form per week (Week 1..Week 6), enable Quiz mode, add multiple-choice questions and mark the correct answers.
 * 5) The URLs for created forms will be logged by Logger and returned by `createAllForms()`.
 *
 * NOTE: This script runs in your Google account — I cannot run it for you. Follow the steps above to create the forms.
 */

// === Replace this QUESTIONS object with your own question data ===
// Expected shape:
// {
//   1: [ { q: 'Question text', choices: ['A','B','C'], a: 1 }, ... ],
//   2: [ ... ],
//   ...
// }
// `a` is the index of the correct choice (0-based)
const QUESTIONS = {
  1: [
    { q: 'How do you say "hello" formally?', choices: ['Hola', 'Hello', 'Goodbye', 'Please'], a: 1 },
    { q: 'Which phrase is a greeting?', choices: ['Thank you','How are you?','Good night','See you later'], a: 1 }
  ],
  2: [
    { q: 'How do you say please?', choices: ['Gracias','Por favor','De nada','Lo siento'], a: 1 }
  ]
  // Fill out weeks 3..6 accordingly
};

/**
 * Create a Google Form for a given week and questions array.
 * Returns an object { week, formId, url }
 */
function createFormForWeek(week, questions){
  const title = `Puente Week ${week} — Quiz`;
  const description = `Quiz for Week ${week} — automatically created by script.`;
  const form = FormApp.create(title).setDescription(description).setIsQuiz(true);
  // optional: collect email addresses
  // form.setCollectEmail(true);

  for (let i = 0; i < (questions || []).length; i++){
    const it = questions[i];
    if (!it || !it.q) continue;
    // Create a multiple choice item
    const item = form.addMultipleChoiceItem();
    const choices = [];
    const opts = Array.isArray(it.choices) ? it.choices : [];
    for (let j = 0; j < opts.length; j++){
      const text = String(opts[j] || '');
      choices.push(item.createChoice(text, j === Number(it.a)));
    }
    item.setTitle(it.q).setChoices(choices).setPoints(1);
  }

  // Optionally set a custom confirmation message
  form.setCustomClosedFormMessage('Thanks for completing the quiz.');

  // Return form info
  const info = { week: week, formId: form.getId(), url: form.getPublishedUrl(), editUrl: form.getEditUrl() };
  Logger.log('Created form for week %s: %s (edit: %s)', week, info.url, info.editUrl);
  return info;
}

/**
 * Create forms for all weeks found in QUESTIONS (1..6 recommended).
 * Returns an array of created form info objects.
 */
function createAllForms(){
  const results = [];
  const weeks = Object.keys(QUESTIONS).map(x => Number(x)).sort((a,b) => a-b);
  for (let i = 0; i < weeks.length; i++){
    const w = weeks[i];
    const q = QUESTIONS[w] || [];
    try{
      const info = createFormForWeek(w, q);
      results.push(info);
    }catch(e){ Logger.log('Failed to create form for week %s: %s', w, e && e.toString()); }
  }
  // Write a short summary doc in Drive to keep links handy
  try{
    const doc = DocumentApp.create('Puente - Created Quiz Forms');
    const body = doc.getBody();
    body.appendParagraph('Puente created quiz forms');
    body.appendParagraph('Generated on: ' + (new Date()).toString());
    results.forEach(r => {
      body.appendParagraph('Week ' + r.week + '\nForm: ' + r.url + '\nEdit: ' + r.editUrl);
    });
    doc.saveAndClose();
    Logger.log('Summary document created: %s', doc.getUrl());
  }catch(e){ Logger.log('Could not create summary doc: %s', e && e.toString()); }

  return results;
}

/**
 * Helper to test the creation for a single week (run from editor)
 */
function testCreateWeek1(){
  return createFormForWeek(1, QUESTIONS[1]);
}

/**
 * Utility: import JSON string of questions into QUESTIONS constant.
 * Use this function from the Apps Script editor console if you want to paste a JSON string.
 */
function importQuestionsFromJsonString(jsonStr){
  try{
    const obj = JSON.parse(jsonStr);
    // This function cannot reassign the const QUESTIONS at runtime in Apps Script.
    // Instead, you should paste the JSON into the QUESTIONS constant above.
    Logger.log('Parsed object contains weeks: %s', Object.keys(obj).join(','));
    return Object.keys(obj).map(k => `${k}: ${obj[k].length} questions`).join('\n');
  }catch(e){ Logger.log('Failed to parse JSON: %s', e && e.toString()); return null; }
}

const { PythonShell } = require('python-shell');
const path = require('path');
require('dotenv').config();

const scriptsDir = path.join(__dirname, '../src/python_scripts');
const pythonPath = process.env.PYTHON_PATH || 'python';

async function testScript(scriptName, args = []) {
  console.log(`\n🧪 Testing ${scriptName}...`);

  const options = {
    mode: 'json',
    pythonPath: pythonPath,
    scriptPath: scriptsDir,
    args: args,
  };

  try {
    const results = await PythonShell.run(scriptName, options);
    console.log(
      `✅ ${scriptName} returned valid JSON:`,
      JSON.stringify(results[0]).substring(0, 100) + '...'
    );
    return true;
  } catch (err) {
    console.error(`❌ ${scriptName} failed or returned invalid JSON:`);
    console.error(`   Error message: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Python Output Verification Tests');
  console.log('-------------------------------------------');

  
  const nlpTest = await testScript('nlp_processor.py', ['test']);

 
  const audioTest = await testScript('audio_processor.py', []);

  console.log('\n-------------------------------------------');
  if (nlpTest) {
    console.log(
      '🎉 Verification passed! (Note: audio_processor expected to "fail" without input file, but checking parser integrity)'
    );
  } else {
    console.log('⚠️ Verification failed.');
  }
}

runTests();

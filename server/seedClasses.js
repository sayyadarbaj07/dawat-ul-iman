require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('./src/models/classModel');

const CANONICAL_CLASSES = [
  // Shob-e-Deeniyat
  { department: 'diniyat', name: 'awwal', fullName: 'Shob-e-Deeniyat - Awwal', section: '' },
  { department: 'diniyat', name: 'duwwam', fullName: 'Shob-e-Deeniyat - Duwwam', section: '' },
  { department: 'diniyat', name: 'ibtedai', fullName: 'Shob-e-Deeniyat - Ibtedai', section: '' },
  { department: 'diniyat', name: 'other', fullName: 'Shob-e-Deeniyat - Other', section: '' },
  // Shob-e-Hifz
  { department: 'hifz', name: 'alif', fullName: 'Shob-e-Hifz - Alif', section: '' },
  { department: 'hifz', name: 'ba', fullName: 'Shob-e-Hifz - Ba', section: '' },
  { department: 'hifz', name: 'other', fullName: 'Shob-e-Hifz - Other', section: '' },
  // Shob-e-Alimiyat
  { department: 'alimiyat', name: 'awwal', fullName: 'Shob-e-Alimiyat - Awwal', section: '' },
  { department: 'alimiyat', name: 'doem', fullName: 'Shob-e-Alimiyat - Doem', section: '' },
  { department: 'alimiyat', name: 'soem', fullName: 'Shob-e-Alimiyat - Soem', section: '' },
  { department: 'alimiyat', name: 'chaharum', fullName: 'Shob-e-Alimiyat - Chaharum', section: '' },
  { department: 'alimiyat', name: 'panjum', fullName: 'Shob-e-Alimiyat - Panjum', section: '' },
  { department: 'alimiyat', name: 'shashum', fullName: 'Shob-e-Alimiyat - Shashum', section: '' },
  { department: 'alimiyat', name: 'haftum', fullName: 'Shob-e-Alimiyat - Haftum', section: '' },
  { department: 'alimiyat', name: 'hashtum', fullName: 'Shob-e-Alimiyat - Hashtum', section: '' },
  { department: 'alimiyat', name: 'nohum', fullName: 'Shob-e-Alimiyat - Nohum', section: '' },
  { department: 'alimiyat', name: 'dahum', fullName: 'Shob-e-Alimiyat - Dahum', section: '' },
  { department: 'alimiyat', name: 'dowrah', fullName: 'Shob-e-Alimiyat - Dowrah', section: '' },
  // Shob-e-Qirat
  { department: 'qirat', name: 'hafs', fullName: 'Shob-e-Qirat - Hafs', section: '' },
  { department: 'qirat', name: 'saba', fullName: 'Shob-e-Qirat - Saba', section: '' },
  { department: 'qirat', name: 'ashra', fullName: 'Shob-e-Qirat - Ashra', section: '' }
];

async function runSeed() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n=== Seeding Classes ${isDryRun ? '(DRY RUN)' : '(LIVE)'} ===`);

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingClasses = await Class.find({});
    console.log(`Current class count in DB: ${existingClasses.length}`);

    // Map by department|name|section
    const existingMap = new Set(
      existingClasses.map(c => `${c.department}|${c.name}|${c.section}`)
    );
    
    // Map by fullName
    const existingFullNameMap = new Set(
      existingClasses.map(c => c.fullName)
    );

    let createdCount = 0;
    let skippedCount = 0;
    let createdClasses = [];
    let skippedClasses = [];

    for (const c of CANONICAL_CLASSES) {
      const key = `${c.department}|${c.name}|${c.section}`;

      // Check if it already exists by key OR fullName
      if (existingMap.has(key) || existingFullNameMap.has(c.fullName)) {
        skippedClasses.push(c.fullName);
        skippedCount++;
        continue;
      }

      if (!isDryRun) {
        await Class.updateOne(
          { department: c.department, name: c.name, section: c.section },
          { $setOnInsert: { fullName: c.fullName, status: 'active' } },
          { upsert: true }
        );
      }
      
      createdClasses.push(c.fullName);
      createdCount++;
    }

    console.log('\n--- Result ---');
    console.log(`Classes Skipped (Already Exist): ${skippedCount}`);
    skippedClasses.forEach(c => console.log(`  - SKIP: ${c}`));

    console.log(`Classes Created: ${createdCount}`);
    createdClasses.forEach(c => console.log(`  - CREATE: ${c}`));

    console.log('\n--- Verification ---');
    const finalClasses = await Class.find({});
    console.log(`Final Class Count (if applied): ${isDryRun ? existingClasses.length + createdCount : finalClasses.length}`);
    
    // Verify legacy records
    const testRecords = finalClasses.filter(c => c.name === 'unauthorized class' || c.name === 'wrong class');
    console.log(`Test records intact: ${testRecords.length === 2 ? 'YES' : 'NO'} (${testRecords.length} found)`);

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

runSeed();

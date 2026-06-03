const fs = require('fs');
const mongoose = require('mongoose');

// Need to match your backend schema structure
const slideSchema = new mongoose.Schema({
  assessmentId: mongoose.Schema.Types.ObjectId,
  module: String, // 'TAT', 'WAT', 'SRT', 'SDT', etc.
  slideType: String, // 'INSTRUCTION', 'IMAGE', 'WORD', 'TEXT', 'BREAK', 'BLACKOUT'
  order: Number,
  content: String, // the tldraw JSON string
  imageUrl: String,
  duration: Number,
  isInstruction: Boolean
}, { timestamps: true });

const assessmentSchema = new mongoose.Schema({
  title: String,
  status: String,
  createdAt: Date
});

const Slide = mongoose.model('Slide', slideSchema);
const Assessment = mongoose.model('Assessment', assessmentSchema);

function createTldrawTextSnapshot(text, size = 'xl', y = 400, align = 'middle') {
  return JSON.stringify({
    "document": {
      "store": {
        "document:document": { "gridSize": 10, "name": "", "meta": {}, "id": "document:document", "typeName": "document" },
        "page:page": { "meta": {}, "id": "page:page", "name": "Page 1", "index": "a1", "typeName": "page" },
        "shape:text1": {
          "x": align === 'middle' ? 200 : 100, 
          "y": y, 
          "rotation": 0, 
          "isLocked": false, 
          "opacity": 1, 
          "meta": {}, 
          "id": "shape:text1", 
          "type": "text",
          "props": {
            "color": "black", 
            "size": size, 
            "w": 800, 
            "text": text, 
            "font": "sans", 
            "align": align, 
            "autoSize": true, 
            "scale": 1
          },
          "parentId": "page:page", 
          "index": "a1", 
          "typeName": "shape"
        }
      }
    }
  });
}

function createTldrawSRTSnapshot(situations) {
  const store = {
    "document:document": { "gridSize": 10, "name": "", "meta": {}, "id": "document:document", "typeName": "document" },
    "page:page": { "meta": {}, "id": "page:page", "name": "Page 1", "index": "a1", "typeName": "page" }
  };
  
  situations.forEach((sit, idx) => {
    store[`shape:srt${idx}`] = {
      "x": 100, 
      "y": 100 + (idx * 120), 
      "rotation": 0, 
      "isLocked": false, 
      "opacity": 1, 
      "meta": {}, 
      "id": `shape:srt${idx}`, 
      "type": "text",
      "props": {
        "color": "black", 
        "size": "m", 
        "w": 1000, 
        "text": sit, 
        "font": "sans", 
        "align": "start", 
        "autoSize": true, 
        "scale": 1
      },
      "parentId": "page:page", 
      "index": `a${idx}`, 
      "typeName": "shape"
    };
  });
  
  return JSON.stringify({ document: { store } });
}

function createTldrawImageSnapshot(imageUrl) {
  return JSON.stringify({
    "document": {
      "store": {
        "document:document": { "gridSize": 10, "name": "", "meta": {}, "id": "document:document", "typeName": "document" },
        "page:page": { "meta": {}, "id": "page:page", "name": "Page 1", "index": "a1", "typeName": "page" },
        "asset:image1": {
          "id": "asset:image1",
          "typeName": "asset",
          "type": "image",
          "meta": {},
          "props": {
            "w": 800,
            "h": 600,
            "name": "image",
            "isAnimated": false,
            "mimeType": "image/jpeg",
            "src": imageUrl
          }
        },
        "shape:image1": {
          "x": 200, 
          "y": 100, 
          "rotation": 0, 
          "isLocked": false, 
          "opacity": 1, 
          "meta": {}, 
          "id": "shape:image1", 
          "type": "image",
          "props": {
            "w": 800,
            "h": 600,
            "playing": true,
            "url": "",
            "assetId": "asset:image1"
          },
          "parentId": "page:page", 
          "index": "a1", 
          "typeName": "shape"
        }
      }
    }
  });
}

async function main() {
  const text = fs.readFileSync('pdf_dump.txt', 'utf8');
  const pages = text.split('--- PAGE ');
  
  const watWords = [];
  const srtSituations = [];
  
  for (const page of pages) {
    if (!page.trim()) continue;
    
    // Parse WAT words
    // WAT words are on pages 32-93, usually just a single word
    if (page.includes('WAT') || watWords.length > 0) {
      const lines = page.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length > 1) {
        const word = lines[1]; // line 0 is the page number
        if (word && word === word.toUpperCase() && word.length > 1 && !word.includes('TURN THE PAGE') && !word.includes('10 minutes break')) {
          if (watWords.length < 60) {
            watWords.push(word);
          }
        }
      }
    }
    
    // Parse SRT
    // Situations start with a number like "1." or "7." or "13."
    const lines = page.split('\n').map(l => l.trim()).filter(l => l);
    let currentSit = "";
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentSit) {
          srtSituations.push(currentSit);
        }
        // Normalize the numbering since OCR messed up the numbers
        const normalizedSit = line.replace(/^\d+\./, `${srtSituations.length + 1}.`);
        currentSit = normalizedSit;
      } else if (currentSit && line.length > 5 && !line.includes('--- PAGE')) {
        currentSit += " " + line;
      }
    }
    if (currentSit) {
      srtSituations.push(currentSit);
    }
  }
  
  // Dedup and clean SRT (take only the first 60)
  // Our logic above might capture some garbage. Let's filter accurately.
  const finalSrt = srtSituations.filter(s => s.match(/^\d+\./)).slice(0, 60);
  
  console.log(`Parsed ${watWords.length} WAT words and ${finalSrt.length} SRT situations.`);
  
  await mongoose.connect('mongodb+srv://isvclub2021:ddtIDjbRII76huv8@ssbwithisvleads.3fu0m.mongodb.net/?appName=SsbWithIsvLeads');
  console.log("Connected to MongoDB.");
  
  const assessment = await Assessment.create({
    title: "Psych Battery (Male) - Auto Seeded",
    status: 'draft',
    createdAt: new Date()
  });
  
  const slides = [];
  
  // 1. TAT Module
  slides.push({
    assessmentId: assessment._id, module: 'TAT', slideType: 'INSTRUCTION', order: 0, duration: 240, isInstruction: true,
    content: createTldrawTextSnapshot("THEMATIC APPERCEPTION TEST\n\n11 Pictures will be shown.\n1 Blank picture.\n30s to view, 4 mins to write.", "l", 200)
  });
  // We need the manually verified extracted images for TAT
  // For now, I will link to the 12 images. The user has to verify the correct image files.
  // Extracted images have names like extracted_4_13.jpeg. I will just pick 12 dummy names for now to demonstrate.
  // The user can re-upload them in the editor later.
  for (let i = 1; i <= 11; i++) {
    slides.push({
      assessmentId: assessment._id, module: 'TAT', slideType: 'IMAGE', order: i, duration: 30, isInstruction: false,
      content: createTldrawTextSnapshot(`[TAT Image ${i} Placeholder]\nPlease replace this slide with the actual image.`, "xl", 400)
    });
    slides.push({
      assessmentId: assessment._id, module: 'TAT', slideType: 'BLACKOUT', order: i + 100, duration: 240, isInstruction: false,
      content: ""
    });
  }
  // Blank slide
  slides.push({
    assessmentId: assessment._id, module: 'TAT', slideType: 'WORD', order: 12, duration: 30, isInstruction: false,
    content: createTldrawTextSnapshot("BLANK SLIDE", "xl")
  });
  
  // 2. WAT Module
  slides.push({
    assessmentId: assessment._id, module: 'WAT', slideType: 'INSTRUCTION', order: 0, duration: 180, isInstruction: true,
    content: createTldrawTextSnapshot("WORD ASSOCIATION TEST\n\n60 Words.\n15 seconds each.", "l", 200)
  });
  
  watWords.forEach((word, index) => {
    slides.push({
      assessmentId: assessment._id, module: 'WAT', slideType: 'WORD', order: index + 1, duration: 15, isInstruction: false,
      content: createTldrawTextSnapshot(word, "xl", 400, "middle")
    });
  });
  
  // 3. SRT Module
  slides.push({
    assessmentId: assessment._id, module: 'SRT', slideType: 'INSTRUCTION', order: 0, duration: 180, isInstruction: true,
    content: createTldrawTextSnapshot("SITUATION REACTION TEST\n\n60 Situations (10 slides, 6 each).\n30 minutes total.", "l", 200)
  });
  
  for (let i = 0; i < 10; i++) {
    const chunk = finalSrt.slice(i * 6, i * 6 + 6);
    slides.push({
      assessmentId: assessment._id, module: 'SRT', slideType: 'TEXT', order: i + 1, duration: 180, isInstruction: false,
      content: createTldrawSRTSnapshot(chunk)
    });
  }
  
  // 4. SDT Module
  slides.push({
    assessmentId: assessment._id, module: 'SDT', slideType: 'INSTRUCTION', order: 0, duration: 180, isInstruction: true,
    content: createTldrawTextSnapshot("SELF DESCRIPTION TEST\n\nWrite 5 paragraphs about yourself.", "l", 200)
  });
  slides.push({
    assessmentId: assessment._id, module: 'SDT', slideType: 'TEXT', order: 1, duration: 900, isInstruction: false,
    content: createTldrawTextSnapshot("1. Parents' opinion\n2. Teachers' opinion\n3. Friends' opinion\n4. Own opinion\n5. Future goals", "l", 200, "start")
  });
  
  await Slide.insertMany(slides);
  console.log(`Seeded ${slides.length} slides successfully.`);
  process.exit(0);
}

main().catch(console.error);

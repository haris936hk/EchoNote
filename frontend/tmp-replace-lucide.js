const fs = require('fs');
const glob = require('glob');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

glob(srcDir + '/**/*.{js,jsx}', (err, files) => {
  if (err) throw err;
  let count = 0;
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Check if lucide-react is imported
    const regex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;
    let modified = false;

    content = content.replace(regex, (match, importsStr) => {
      modified = true;
      const imports = importsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const newImports = imports.map((imp) => {
        // e.g. "Mic" -> "LuMic as Mic"
        // if aliased "ArrowRight as Right", we skip or handle (lucide uses simple imports mostly)
        if (imp.includes(' as ')) {
          const parts = imp.split(' as ');
          return `Lu${parts[0].trim()} as ${parts[1].trim()}`;
        }
        return `Lu${imp} as ${imp}`;
      });
      return `import { ${newImports.join(', ')} } from 'react-icons/lu';`;
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
    }
  }
  console.log(`Replaced lucide-react with react-icons/lu in ${count} files.`);
});

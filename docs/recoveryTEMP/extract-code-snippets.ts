/**
 * Extract all code snippets from copypasta.txt with context
 * Groups by file, prioritizes most recent snippets when there's overlap
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeSnippet {
  file: string;
  lineNumber: number; // Line number in copypasta.txt where snippet starts
  addedLines: string[];
  removedLines: string[];
  contextBefore: string; // Text before this snippet
  contextAfter: string; // Text after this snippet
  description?: string; // Any description text near the snippet
}

function parseCopypasta(filePath: string): Map<string, CodeSnippet[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const snippetsByFile = new Map<string, CodeSnippet[]>();
  let currentFile: string | null = null;
  let currentSnippet: CodeSnippet | null = null;
  let contextBefore: string[] = [];
  let descriptionBuffer: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if this is a filename line (ends with .ts, .tsx, .json, .md, no leading + or -)
    const fileMatch = line.match(/^([a-zA-Z0-9_/-]+\.(ts|tsx|json|md|mdx))$/);
    if (fileMatch && !line.startsWith('+') && !line.startsWith('-')) {
      // Save previous snippet if exists
      if (currentSnippet && currentFile) {
        currentSnippet.contextBefore = contextBefore.slice(-15).join('\n'); // Last 15 lines
        if (!snippetsByFile.has(currentFile)) {
          snippetsByFile.set(currentFile, []);
        }
        snippetsByFile.get(currentFile)!.push(currentSnippet);
      }
      
      currentFile = fileMatch[1];
      currentSnippet = {
        file: currentFile,
        lineNumber: i + 1,
        addedLines: [],
        removedLines: [],
        contextBefore: '',
        contextAfter: '',
        description: descriptionBuffer.join(' ').slice(-200), // Last 200 chars
      };
      contextBefore = [];
      descriptionBuffer = [];
      i++;
      continue;
    }
    
    // Check for diff indicators (+N or -N)
    const diffMatch = line.match(/^([+-])(\d+)$/);
    if (diffMatch && currentSnippet) {
      const isAdd = diffMatch[1] === '+';
      const count = parseInt(diffMatch[2], 10);
      i++;
      
      // Read the next N lines (or until we hit another diff indicator or filename)
      const codeLines: string[] = [];
      let linesRead = 0;
      
      while (linesRead < count && i < lines.length) {
        const nextLine = lines[i];
        
        // Stop if we hit another diff indicator or filename
        if (nextLine.match(/^([+-])(\d+)$/) || nextLine.match(/^[a-zA-Z0-9_/-]+\.(ts|tsx|json|md)$/)) {
          break;
        }
        
        codeLines.push(nextLine);
        linesRead++;
        i++;
      }
      
      // If we didn't read enough lines, the code might be on the same line
      if (linesRead === 0 && i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.match(/^([+-])(\d+)$/) && !nextLine.match(/^[a-zA-Z0-9_/-]+\.(ts|tsx|json|md)$/)) {
          codeLines.push(nextLine);
          i++;
        }
      }
      
      if (isAdd) {
        currentSnippet.addedLines.push(...codeLines);
      } else {
        currentSnippet.removedLines.push(...codeLines);
      }
      continue;
    }
    
    // Accumulate context (non-code lines)
    if (currentSnippet) {
      // If this looks like a description (not code), add to description buffer
      if (!line.includes('{') && !line.includes('}') && !line.includes('=>') && !line.includes('function')) {
        descriptionBuffer.push(line);
        if (descriptionBuffer.length > 10) {
          descriptionBuffer.shift();
        }
      }
      contextBefore.push(line);
      // Keep context buffer to reasonable size
      if (contextBefore.length > 30) {
        contextBefore.shift();
      }
    }
    
    i++;
  }
  
  // Save last snippet
  if (currentSnippet && currentFile) {
    currentSnippet.contextBefore = contextBefore.join('\n');
    if (!snippetsByFile.has(currentFile)) {
      snippetsByFile.set(currentFile, []);
    }
    snippetsByFile.get(currentFile)!.push(currentSnippet);
  }
  
  return snippetsByFile;
}

function mergeSnippets(snippets: CodeSnippet[]): CodeSnippet {
  // Sort by line number (most recent last)
  const sorted = [...snippets].sort((a, b) => a.lineNumber - b.lineNumber);
  
  // For added lines: keep all unique lines, but prioritize later ones (remove duplicates, keep last occurrence)
  const addedLinesMap = new Map<string, number>(); // line -> lineNumber
  const removedLinesSet = new Set<string>();
  
  // Process in order, later snippets override earlier ones
  for (const snippet of sorted) {
    // Track added lines with their source line number
    for (const line of snippet.addedLines) {
      const trimmed = line.trim();
      if (trimmed) {
        addedLinesMap.set(trimmed, snippet.lineNumber);
      }
    }
    
    for (const line of snippet.removedLines) {
      const trimmed = line.trim();
      if (trimmed) {
        removedLinesSet.add(trimmed);
      }
    }
  }
  
  // Convert map back to array, sorted by line number (most recent last)
  const addedLinesArray = Array.from(addedLinesMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([line]) => line);
  
  return {
    file: sorted[0].file,
    lineNumber: sorted[sorted.length - 1].lineNumber, // Most recent line number
    addedLines: addedLinesArray,
    removedLines: Array.from(removedLinesSet),
    contextBefore: sorted[sorted.length - 1].contextBefore, // Most recent context
    contextAfter: '',
    description: sorted[sorted.length - 1].description, // Most recent description
  };
}

function generateOutput(snippetsByFile: Map<string, CodeSnippet[]>): string {
  const output: string[] = [];
  output.push('# Extracted Code Snippets from Copypasta\n');
  output.push(`Generated: ${new Date().toISOString()}\n`);
  output.push(`Total files: ${snippetsByFile.size}\n`);
  output.push('---\n\n');
  
  // Sort files alphabetically
  const files = Array.from(snippetsByFile.keys()).sort();
  
  for (const file of files) {
    const snippets = snippetsByFile.get(file)!;
    const merged = mergeSnippets(snippets);
    
    output.push(`## ${file}\n`);
    output.push(`*Found ${snippets.length} snippet(s), merged from lines ${snippets[0].lineNumber} to ${snippets[snippets.length - 1].lineNumber}*\n`);
    
    if (merged.description) {
      output.push('### Description\n');
      output.push(merged.description);
      output.push('\n');
    }
    
    if (merged.contextBefore) {
      output.push('### Context (before snippet)\n');
      output.push('```');
      const contextLines = merged.contextBefore.split('\n').slice(-20); // Last 20 lines
      output.push(contextLines.join('\n'));
      output.push('```\n');
    }
    
    if (merged.addedLines.length > 0) {
      output.push('### Added Code\n');
      output.push('```typescript');
      // Clean up the code (remove extra whitespace, fix formatting)
      const cleaned = merged.addedLines
        .map(line => {
          // Fix lines that have multiple statements on one line
          return line.replace(/;/g, ';\n').replace(/\n\n+/g, '\n');
        })
        .join('\n');
      output.push(cleaned);
      output.push('```\n');
    }
    
    if (merged.removedLines.length > 0) {
      output.push('### Removed Code\n');
      output.push('```typescript');
      const cleaned = merged.removedLines
        .map(line => line.replace(/;/g, ';\n').replace(/\n\n+/g, '\n'))
        .join('\n');
      output.push(cleaned);
      output.push('```\n');
    }
    
    // Show all individual snippets for reference
    if (snippets.length > 1) {
      output.push('### All Snippets (for reference)\n');
      for (const snippet of snippets) {
        output.push(`#### Snippet at line ${snippet.lineNumber}\n`);
        if (snippet.addedLines.length > 0) {
          output.push('```typescript');
          output.push(snippet.addedLines.join('\n'));
          output.push('```\n');
        }
      }
    }
    
    output.push('---\n\n');
  }
  
  return output.join('\n');
}

// Main execution
const copypastaPath = path.join(__dirname, 'copypasta.txt');
const outputPath = path.join(__dirname, 'extracted-code-snippets.md');

console.log('Parsing copypasta.txt...');
const snippetsByFile = parseCopypasta(copypastaPath);

console.log(`\nFound snippets for ${snippetsByFile.size} files:`);
let totalSnippets = 0;
for (const [file, snippets] of snippetsByFile.entries()) {
  console.log(`  ${file}: ${snippets.length} snippet(s)`);
  totalSnippets += snippets.length;
}
console.log(`\nTotal snippets: ${totalSnippets}`);

console.log('\nGenerating output...');
const output = generateOutput(snippetsByFile);

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`\nOutput written to: ${outputPath}`);
console.log(`Output size: ${(output.length / 1024).toFixed(2)} KB`);

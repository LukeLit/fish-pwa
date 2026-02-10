/**
 * Extract all code snippets from copypasta.txt with context
 * Groups by file, prioritizes most recent snippets when there's overlap
 * Improved version that handles the actual format better
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeSnippet {
  file: string;
  lineNumber: number;
  addedLines: string[];
  removedLines: string[];
  contextBefore: string[];
  contextAfter: string[];
}

function cleanCodeLine(line: string): string {
  // Remove diff markers that might be embedded
  return line
    .replace(/^[+-]\d+\s*/, '') // Remove leading +N or -N
    .trim();
}

function splitConcatenatedCode(line: string): string[] {
  // Some lines have multiple statements concatenated with spaces
  // Try to split them intelligently
  const parts: string[] = [];
  
  // Split by common separators but preserve structure
  // Look for patterns like "property?: type;" followed by another property
  const statements = line.split(/(?=\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*[?:=])/);
  
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed && !trimmed.match(/^[+-]\d+$/)) {
      parts.push(trimmed);
    }
  }
  
  // If splitting didn't help, return the original line
  return parts.length > 1 ? parts : [line];
}

function parseCopypasta(filePath: string): Map<string, CodeSnippet[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const snippetsByFile = new Map<string, CodeSnippet[]>();
  let currentFile: string | null = null;
  let currentSnippet: CodeSnippet | null = null;
  let contextBefore: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this is a filename line (ends with .ts, .tsx, .json, .md, no leading + or -)
    const fileMatch = trimmed.match(/^([a-zA-Z0-9_/-]+\.(ts|tsx|json|md|mdx))$/);
    if (fileMatch && !trimmed.startsWith('+') && !trimmed.startsWith('-')) {
      // Save previous snippet if exists
      if (currentSnippet && currentFile) {
        currentSnippet.contextBefore = contextBefore.slice(-20); // Last 20 lines
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
        contextBefore: [],
        contextAfter: [],
      };
      contextBefore = [];
      i++;
      continue;
    }
    
    // Check for diff indicators (+N or -N on their own line)
    const diffMatch = trimmed.match(/^([+-])(\d+)$/);
    if (diffMatch && currentSnippet) {
      const isAdd = diffMatch[1] === '+';
      const count = parseInt(diffMatch[2], 10);
      i++;
      
      // Read the next N lines
      const codeLines: string[] = [];
      let linesRead = 0;
      
      while (linesRead < count && i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        
        // Stop if we hit another diff indicator or filename
        if (nextTrimmed.match(/^([+-])(\d+)$/) || nextTrimmed.match(/^[a-zA-Z0-9_/-]+\.(ts|tsx|json|md)$/)) {
          break;
        }
        
        // Clean and potentially split the line
        const cleaned = cleanCodeLine(nextLine);
        if (cleaned) {
          const split = splitConcatenatedCode(cleaned);
          codeLines.push(...split);
        } else {
          codeLines.push(''); // Preserve empty lines
        }
        
        linesRead++;
        i++;
      }
      
      // Filter out empty strings and diff markers
      const filtered = codeLines.filter(l => l && !l.match(/^[+-]\d+$/));
      
      if (isAdd) {
        currentSnippet.addedLines.push(...filtered);
      } else {
        currentSnippet.removedLines.push(...filtered);
      }
      continue;
    }
    
    // Accumulate context (non-code lines)
    if (currentSnippet) {
      // Skip lines that are just diff markers
      if (!trimmed.match(/^[+-]\d+$/)) {
        contextBefore.push(line);
        // Keep context buffer to reasonable size
        if (contextBefore.length > 30) {
          contextBefore.shift();
        }
      }
    }
    
    i++;
  }
  
  // Save last snippet
  if (currentSnippet && currentFile) {
    currentSnippet.contextBefore = contextBefore;
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
  
  // For added lines: keep all unique lines, prioritize later ones
  const addedLinesMap = new Map<string, number>(); // line -> lineNumber
  const removedLinesSet = new Set<string>();
  
  // Process in order, later snippets override earlier ones
  for (const snippet of sorted) {
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
    lineNumber: sorted[sorted.length - 1].lineNumber,
    addedLines: addedLinesArray,
    removedLines: Array.from(removedLinesSet),
    contextBefore: sorted[sorted.length - 1].contextBefore.slice(-15),
    contextAfter: [],
  };
}

function formatCodeBlock(lines: string[]): string {
  // Group related lines together
  const formatted: string[] = [];
  let currentBlock: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentBlock.length > 0) {
        formatted.push(...currentBlock);
        formatted.push('');
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  
  if (currentBlock.length > 0) {
    formatted.push(...currentBlock);
  }
  
  return formatted.join('\n');
}

function generateOutput(snippetsByFile: Map<string, CodeSnippet[]>): string {
  const output: string[] = [];
  output.push('# Extracted Code Snippets from Copypasta\n');
  output.push(`Generated: ${new Date().toISOString()}\n`);
  output.push(`Total files: ${snippetsByFile.size}\n`);
  output.push('\n---\n\n');
  
  // Sort files alphabetically
  const files = Array.from(snippetsByFile.keys()).sort();
  
  for (const file of files) {
    const snippets = snippetsByFile.get(file)!;
    const merged = mergeSnippets(snippets);
    
    output.push(`## ${file}\n`);
    output.push(`*Found ${snippets.length} snippet(s), merged from lines ${snippets[0].lineNumber} to ${snippets[snippets.length - 1].lineNumber}*\n\n`);
    
    if (merged.contextBefore.length > 0) {
      output.push('### Context\n');
      output.push('```');
      const contextLines = merged.contextBefore.slice(-15).join('\n');
      output.push(contextLines);
      output.push('```\n\n');
    }
    
    if (merged.addedLines.length > 0) {
      output.push('### Added Code\n');
      output.push('```typescript\n');
      output.push(formatCodeBlock(merged.addedLines));
      output.push('\n```\n\n');
    }
    
    if (merged.removedLines.length > 0) {
      output.push('### Removed Code\n');
      output.push('```typescript\n');
      output.push(formatCodeBlock(merged.removedLines));
      output.push('\n```\n\n');
    }
    
    // Show all individual snippets for reference (if multiple)
    if (snippets.length > 1) {
      output.push('<details>\n<summary>All individual snippets (click to expand)</summary>\n\n');
      for (const snippet of snippets) {
        output.push(`#### Snippet at line ${snippet.lineNumber}\n`);
        if (snippet.addedLines.length > 0) {
          output.push('```typescript\n');
          output.push(formatCodeBlock(snippet.addedLines));
          output.push('\n```\n');
        }
        if (snippet.removedLines.length > 0) {
          output.push('Removed:\n```typescript\n');
          output.push(formatCodeBlock(snippet.removedLines));
          output.push('\n```\n');
        }
        output.push('\n');
      }
      output.push('</details>\n\n');
    }
    
    output.push('---\n\n');
  }
  
  return output.join('');
}

// Main execution
const copypastaPath = path.join(__dirname, 'copypasta.txt');
const outputPath = path.join(__dirname, 'extracted-code-snippets-v2.md');

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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONSTANTS_PATH = path.join(__dirname, '../constants.ts');
const USER_ID = 'cXJ2lKAAAAAJ'; // Jiajun Tang's Google Scholar User ID

async function fetchCitations() {
    try {
        console.log('Fetching Google Scholar profile...');
        const response = await fetch(`https://scholar.google.com/citations?user=${USER_ID}&hl=en`);
        const html = await response.text();

        // Read current constants.ts
        let content = fs.readFileSync(CONSTANTS_PATH, 'utf-8');

        // Find all papers with googleScholarId
        const paperRegex = /googleScholarId:\s*'([^']+)'/g;
        let match;
        let updated = false;

        while ((match = paperRegex.exec(content)) !== null) {
            const fullId = match[1];
            // The ID in the file is likely "USER_ID:PAPER_ID", but the link on the profile page 
            // usually contains "citation_for_view=USER_ID:PAPER_ID"

            console.log(`Processing paper with ID: ${fullId}`);

            // Regex to find the citation count for this specific paper in the HTML
            // Looking for a link with the citation_for_view parameter and then the citation count in the next cell
            // The HTML structure is roughly: <a href="...citation_for_view=ID...">Title</a> ... <a class="gsc_a_ac gs_ibl">COUNT</a>

            // We need to be careful with regex on HTML, but for this specific structure it might be robust enough if the structure doesn't change often.
            // A more robust way is to look for the specific string in the href.

            const escapedId = fullId.replace(/:/g, '%3A');
            // Pattern: href="...citation_for_view=ID..." ... class="gsc_a_ac gs_ibl">COUNT</a>
            const citationPattern = new RegExp(`citation_for_view=${fullId}[^>]+>.*?class="gsc_a_ac[^"]*">(\\d+)</a>`, 's');

            const citationMatch = html.match(citationPattern);

            if (citationMatch) {
                const count = parseInt(citationMatch[1], 10);
                console.log(`Found citation count: ${count}`);

                // Update the file content
                // We look for the block containing this ID and update the citationCount before it
                // This is tricky with regex global replace. 
                // Instead, let's find the specific block in the file content.

                // We assume the structure:
                // citationCount: N,
                // type: 'gs',
                // googleScholarId: 'ID'

                // We will replace the citationCount line preceding this specific googleScholarId
                // We use a negative lookahead to ensure we capture the closest citationCount
                const blockRegex = new RegExp(`(citationCount:\\s*)(\\d+)(,(?:(?!citationCount:)[\\s\\S])*?googleScholarId:\\s*'${fullId}')`);

                if (blockRegex.test(content)) {
                    const currentBlockMatch = content.match(blockRegex);
                    if (currentBlockMatch && parseInt(currentBlockMatch[2]) !== count) {
                        content = content.replace(blockRegex, `$1${count}$3`);
                        updated = true;
                        console.log(`Updated citation count to ${count}`);
                    } else {
                        console.log('Citation count is already up to date.');
                    }
                } else {
                    console.warn(`Could not find code block for ${fullId} in constants.ts`);
                }

            } else {
                console.warn(`Could not find citation count for ${fullId} in HTML`);
            }
        }

        if (updated) {
            fs.writeFileSync(CONSTANTS_PATH, content, 'utf-8');
            console.log('constants.ts updated successfully.');
        } else {
            console.log('No changes needed.');
        }

    } catch (error) {
        console.error('Error fetching citations:', error);
        process.exit(1);
    }
}

fetchCitations();

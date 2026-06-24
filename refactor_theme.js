const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Backgrounds (Main Screens)
    content = content.replace(/bg-white dark:bg-gray-900/g, 'bg-background');
    content = content.replace(/bg-gray-50 dark:bg-gray-900/g, 'bg-background');
    content = content.replace(/dark:bg-gray-900 bg-white/g, 'bg-background');
    content = content.replace(/dark:bg-gray-900/g, 'bg-background');
    
    // Backgrounds (Cards / Surfaces)
    content = content.replace(/bg-white dark:bg-gray-800/g, 'bg-surface');
    content = content.replace(/bg-gray-50 dark:bg-gray-800/g, 'bg-surface');
    content = content.replace(/bg-gray-100 dark:bg-gray-800/g, 'bg-surface');
    content = content.replace(/dark:bg-gray-800 bg-white/g, 'bg-surface');
    content = content.replace(/dark:bg-gray-800/g, 'bg-surface');

    // Text Primary
    content = content.replace(/text-gray-900 dark:text-white/g, 'text-text-primary');
    content = content.replace(/text-gray-800 dark:text-white/g, 'text-text-primary');
    content = content.replace(/dark:text-white text-gray-900/g, 'text-text-primary');
    content = content.replace(/dark:text-white text-gray-800/g, 'text-text-primary');
    content = content.replace(/text-black dark:text-white/g, 'text-text-primary');
    content = content.replace(/dark:text-white/g, 'text-text-primary');
    
    // Text Secondary
    content = content.replace(/text-gray-500 dark:text-gray-400/g, 'text-text-secondary');
    content = content.replace(/text-gray-600 dark:text-gray-400/g, 'text-text-secondary');
    content = content.replace(/text-gray-600 dark:text-gray-300/g, 'text-text-secondary');
    content = content.replace(/text-gray-700 dark:text-gray-300/g, 'text-text-secondary');
    content = content.replace(/text-gray-500/g, 'text-text-secondary');
    content = content.replace(/dark:text-gray-400/g, 'text-text-secondary');
    content = content.replace(/dark:text-gray-300/g, 'text-text-secondary');

    // Borders
    content = content.replace(/border-gray-100 dark:border-gray-800/g, 'border-border');
    content = content.replace(/border-gray-200 dark:border-gray-700/g, 'border-border');
    content = content.replace(/border-gray-200 dark:border-gray-800/g, 'border-border');
    content = content.replace(/border-gray-100 dark:border-gray-700/g, 'border-border');
    content = content.replace(/dark:border-gray-800/g, 'border-border');
    content = content.replace(/dark:border-gray-700/g, 'border-border');

    // Miscellaneous specific replacements
    // Removed aggressive fallbacks to prevent breaking explicitly colored buttons

    fs.writeFileSync(file, content);
    console.log(`Refactored ${file}`);
});

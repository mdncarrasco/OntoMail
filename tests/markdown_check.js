/**
 * markdown_check.js - Runnable self-check for the preserve-to-Drive Markdown.
 *
 * Mirrors buildAboxMarkdown (pure string building) and asserts the document
 * embeds the email reference and the ABox JSON-LD. If the format breaks, this
 * fails. Run: node tests/markdown_check.js
 */
const assert = require('assert');

function buildAboxMarkdown(abox, emailRef) {
  const lines = [];
  lines.push('# OntoMail — ABox preservado');
  lines.push('');
  lines.push('## Correo de origen');
  lines.push('- **Asunto:** ' + (emailRef.subject || '(sin asunto)'));
  lines.push('- **Remitente:** ' + (emailRef.sender || '(desconocido)'));
  if (emailRef.permalink) {
    lines.push('- **Enlace:** ' + emailRef.permalink);
  }
  lines.push('- **Preservado:** ' + new Date().toISOString());
  lines.push('');
  lines.push('## ABox (JSON-LD)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(abox, null, 2));
  lines.push('```');
  return lines.join('\n');
}

const abox = {
  '@context': { gist: 'https://w3id.org/semanticarts/ontology/gistCore#' },
  '@graph': [{ '@id': '_:c1', '@type': 'gist:Commitment', name: 'Enviar F29' }]
};
const emailRef = { subject: 'Impuestos', sender: 'ana@hakalab.com', permalink: 'https://mail.google.com/x' };

const md = buildAboxMarkdown(abox, emailRef);

// The email reference is embedded.
assert.ok(md.includes('**Asunto:** Impuestos'), 'subject present');
assert.ok(md.includes('ana@hakalab.com'), 'sender present');
assert.ok(md.includes('https://mail.google.com/x'), 'permalink present');

// The ABox JSON-LD is embedded in a fenced block and round-trips.
assert.ok(md.includes('```json'), 'fenced json block');
const fenced = md.split('```json')[1].split('```')[0].trim();
assert.deepStrictEqual(JSON.parse(fenced), abox, 'ABox JSON-LD round-trips');

// Missing permalink: line simply omitted, no crash.
const md2 = buildAboxMarkdown(abox, { subject: 'X', sender: 'y' });
assert.ok(!md2.includes('**Enlace:**'), 'no permalink line when absent');
assert.ok(md2.includes('(sin asunto)') === false, 'subject X kept');

console.log('markdown_check: PASS');

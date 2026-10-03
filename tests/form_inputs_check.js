/**
 * form_inputs_check.js - Runnable self-check for the form-input reading logic.
 *
 * CardService isn't available outside Apps Script, so this mirrors ONLY the pure
 * helpers that read Gmail's form values. Covers BOTH shapes: the flat
 * `e.formInput` map (preferred) and the structured `e.formInputs` fallback.
 * If selection detection, title reading, or date handling breaks, this fails.
 * Run: node tests/form_inputs_check.js
 */
const assert = require('assert');

// --- mirrors of the pure helpers in Code.gs / Cards.gs ---
function isSelected(simple, inputs, field) {
  if (Object.prototype.hasOwnProperty.call(simple, field)) {
    return !!simple[field];
  }
  return !!(inputs[field] && inputs[field].stringInputs &&
            inputs[field].stringInputs.value &&
            inputs[field].stringInputs.value.length > 0);
}
function readText(simple, inputs, field) {
  if (typeof simple[field] === 'string') { return simple[field]; }
  if (inputs[field] && inputs[field].stringInputs &&
      inputs[field].stringInputs.value &&
      inputs[field].stringInputs.value.length > 0) {
    return inputs[field].stringInputs.value[0];
  }
  return '';
}
function readDateMs(simple, inputs, field) {
  const v = simple[field];
  if (v && typeof v === 'object' && typeof v.msSinceEpoch !== 'undefined') {
    return Number(v.msSinceEpoch);
  }
  if (typeof v === 'number') { return v; }
  if (inputs[field] && inputs[field].dateInput &&
      typeof inputs[field].dateInput.msSinceEpoch !== 'undefined') {
    return Number(inputs[field].dateInput.msSinceEpoch);
  }
  return null;
}
function parseDueDateMs(iso) {
  if (!iso || typeof iso !== 'string') { return null; }
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { return null; }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// === Shape A: flat e.formInput (the real Gmail shape for these widgets) ===
// Selected switches carry their value; deselected switches are absent.
const flat = {
  'select_0': 'on',
  'title_0': 'Enviar informe',
  'due_0': { msSinceEpoch: Date.UTC(2026, 9, 10) },
  // row 1 deselected: select_1 absent
  'title_1': 'Pagar factura'
};
const noStruct = {};

assert.strictEqual(isSelected(flat, noStruct, 'select_0'), true, 'flat: selected switch');
assert.strictEqual(isSelected(flat, noStruct, 'select_1'), false, 'flat: deselected switch absent');
assert.strictEqual(readText(flat, noStruct, 'title_0'), 'Enviar informe', 'flat: edited title');
assert.strictEqual(readText(flat, noStruct, 'title_9'), '', 'flat: missing title');
assert.strictEqual(readDateMs(flat, noStruct, 'due_0'), Date.UTC(2026, 9, 10), 'flat: date object');
assert.strictEqual(readDateMs(flat, noStruct, 'due_1'), null, 'flat: missing date');

// date can also arrive as a bare number
assert.strictEqual(readDateMs({ 'due_x': Date.UTC(2026, 0, 1) }, noStruct, 'due_x'), Date.UTC(2026, 0, 1));

// === Shape B: structured e.formInputs fallback ===
const structured = {
  'select_0': { stringInputs: { value: ['on'] } },
  'title_0': { stringInputs: { value: ['Enviar informe'] } },
  'due_0': { dateInput: { msSinceEpoch: Date.UTC(2026, 9, 10) } }
};
const noFlat = {};
assert.strictEqual(isSelected(noFlat, structured, 'select_0'), true, 'struct: selected');
assert.strictEqual(isSelected(noFlat, structured, 'select_1'), false, 'struct: absent');
assert.strictEqual(readText(noFlat, structured, 'title_0'), 'Enviar informe', 'struct: title');
assert.strictEqual(readDateMs(noFlat, structured, 'due_0'), Date.UTC(2026, 9, 10), 'struct: date');

// === due-date prefill parse ===
assert.strictEqual(parseDueDateMs('2026-10-10'), Date.UTC(2026, 9, 10));
assert.strictEqual(parseDueDateMs('next friday'), null);
assert.strictEqual(parseDueDateMs(undefined), null);

console.log('form_inputs_check: PASS');

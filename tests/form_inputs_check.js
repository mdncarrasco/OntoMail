/**
 * form_inputs_check.js - Runnable self-check for the form-input reading logic.
 *
 * CardService isn't available outside Apps Script, so this mirrors ONLY the pure
 * helpers that read e.formInputs (the shape Google sends) and the due-date
 * parse. If selection detection, title reading, or date handling breaks, this
 * fails. Run: node tests/form_inputs_check.js
 */
const assert = require('assert');

// --- mirrors of the pure helpers in Code.gs / Cards.gs ---
function isSelected(inputs, field) {
  return !!(inputs[field] && inputs[field].stringInputs &&
            inputs[field].stringInputs.value &&
            inputs[field].stringInputs.value.length > 0);
}
function firstInput(inputs, field) {
  if (inputs[field] && inputs[field].stringInputs &&
      inputs[field].stringInputs.value &&
      inputs[field].stringInputs.value.length > 0) {
    return inputs[field].stringInputs.value[0];
  }
  return '';
}
function firstDateMs(inputs, field) {
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

// --- the shape CardService actually sends in e.formInputs ---
const inputs = {
  'select_0': { stringInputs: { value: ['on'] } },
  'title_0':  { stringInputs: { value: ['Enviar informe'] } },
  'due_0':    { dateInput: { msSinceEpoch: Date.UTC(2026, 9, 10) } },
  // row 1 deselected: the switch is simply absent from the form inputs
  'title_1':  { stringInputs: { value: ['Pagar factura'] } }
};

// Selected row is detected; deselected row is not.
assert.strictEqual(isSelected(inputs, 'select_0'), true);
assert.strictEqual(isSelected(inputs, 'select_1'), false);

// Edited title is read back.
assert.strictEqual(firstInput(inputs, 'title_0'), 'Enviar informe');
// Missing field yields ''.
assert.strictEqual(firstInput(inputs, 'title_9'), '');

// Date is read when present, null when absent.
assert.strictEqual(firstDateMs(inputs, 'due_0'), Date.UTC(2026, 9, 10));
assert.strictEqual(firstDateMs(inputs, 'due_1'), null);

// Due-date prefill parse: valid ISO, and graceful null on junk.
assert.strictEqual(parseDueDateMs('2026-10-10'), Date.UTC(2026, 9, 10));
assert.strictEqual(parseDueDateMs('next friday'), null);
assert.strictEqual(parseDueDateMs(undefined), null);

// A created task's RFC-3339 due string round-trips to the same date.
const due = new Date(firstDateMs(inputs, 'due_0')).toISOString();
assert.ok(due.startsWith('2026-10-10'));

console.log('form_inputs_check: PASS');

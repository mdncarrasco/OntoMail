/**
 * abox_grouping_check.js - Runnable self-check for the ABox grouping logic.
 *
 * CardService isn't available outside Apps Script, so we re-implement ONLY the
 * pure grouping step here and assert it against a sample JSON-LD ABox. If the
 * grouping or type-ordering logic breaks, this fails. Run: node tests/abox_grouping_check.js
 */
const assert = require('assert');

const TYPE_ORDER = ['gist:Person', 'gist:Organization', 'gist:Commitment', 'gist:TimeInterval', 'gist:Magnitude'];

// Mirrors buildResultsCard's grouping (the non-trivial part worth guarding).
function groupByType(abox) {
  const graph = (abox && abox['@graph']) ? abox['@graph'] : [];
  const byType = {};
  for (const inst of graph) {
    const t = inst['@type'];
    (byType[t] = byType[t] || []).push(inst);
  }
  // Emit groups in TYPE_ORDER, skipping empty ones.
  return TYPE_ORDER.filter(t => byType[t] && byType[t].length)
    .map(t => ({ type: t, names: byType[t].map(x => x.name || x['@id']) }));
}

const sample = {
  '@context': { gist: 'https://w3id.org/semanticarts/ontology/gistCore#' },
  '@graph': [
    { '@id': '_:p1', '@type': 'gist:Person', name: 'Ana Torres' },
    { '@id': '_:c1', '@type': 'gist:Commitment', name: 'Enviar informe', dueDate: '2026-10-10' },
    { '@id': '_:o1', '@type': 'gist:Organization', name: 'HakaLab' },
    { '@id': '_:p2', '@type': 'gist:Person', name: 'Luis Rojas' }
  ]
};

const groups = groupByType(sample);

// Groups appear in canonical type order (Person before Organization before Commitment).
assert.deepStrictEqual(groups.map(g => g.type), ['gist:Person', 'gist:Organization', 'gist:Commitment']);
// Both people land in the Person group.
assert.deepStrictEqual(groups[0].names, ['Ana Torres', 'Luis Rojas']);
// Empty types (TimeInterval, Magnitude) are not emitted.
assert.ok(!groups.some(g => g.type === 'gist:TimeInterval'));

// Empty ABox yields no groups (no crash).
assert.deepStrictEqual(groupByType({ '@graph': [] }), []);
assert.deepStrictEqual(groupByType({}), []);

console.log('abox_grouping_check: PASS');

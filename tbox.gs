/**
 * tbox.gs - The gist TBox subset OntoMail sends to the LLM.
 *
 * This is a hand-picked slice of the gist upper ontology (Semantic Arts),
 * mapping the five entity types OntoMail cares about to their canonical gist
 * classes. Verified against ontologies/gistCore.ttl in the gist GitHub repo.
 *
 * gist namespace: https://w3id.org/semanticarts/ontology/gistCore#
 * License: CC-BY 4.0 (Semantic Arts). Attribution kept in README.
 *
 * This is the one place to edit the ontology subset as it grows toward the
 * full corporate TBox.
 */

var GIST_NAMESPACE = 'https://w3id.org/semanticarts/ontology/gistCore#';

/**
 * The TBox subset, as a plain object. Serialized into the prompt so the model
 * knows which gist classes to instantiate and what each means.
 */
var ONTOMAIL_TBOX = {
  namespace: GIST_NAMESPACE,
  prefix: 'gist',
  classes: [
    {
      type: 'gist:Person',
      meaning: 'An individual human being mentioned in the email (sender, recipient, or anyone named).'
    },
    {
      type: 'gist:Organization',
      meaning: 'A company, institution, team, or other named group of people.'
    },
    {
      type: 'gist:Commitment',
      meaning: 'An obligation, promise, action item, or task that someone has agreed to do, arising from the email. This is what becomes a Google Task.'
    },
    {
      type: 'gist:TimeInterval',
      meaning: 'A date, deadline, or period of time relevant to the email (e.g. a due date for a commitment). gist models time as intervals.'
    },
    {
      type: 'gist:Magnitude',
      meaning: 'A monetary amount or other quantity with a value and a unit (e.g. a price, a budget).'
    }
  ]
};

/**
 * Builds the TBox portion of the prompt as a readable instruction block.
 * @returns {string}
 */
function buildTboxPromptBlock() {
  var lines = [];
  lines.push('=== TBOX (gist ontology subset) ===');
  lines.push('Namespace ' + ONTOMAIL_TBOX.prefix + ': <' + ONTOMAIL_TBOX.namespace + '>');
  lines.push('Extract instances of ONLY these gist classes:');
  for (var i = 0; i < ONTOMAIL_TBOX.classes.length; i++) {
    var c = ONTOMAIL_TBOX.classes[i];
    lines.push('- ' + c.type + ': ' + c.meaning);
  }
  return lines.join('\n');
}

/**
 * The JSON Schema OntoMail asks Gemini to conform to (structured output).
 * The ABox is returned as JSON-LD: a @context plus a @graph of typed instances.
 * Each instance carries @id, @type, a human-readable name/label, and for
 * commitments an optional dueDate (ISO yyyy-mm-dd) so it can seed a task.
 * @returns {Object}
 */
function buildAboxResponseSchema() {
  return {
    type: 'object',
    properties: {
      '@context': {
        type: 'object',
        properties: {
          gist: { type: 'string' }
        }
      },
      '@graph': {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            '@id': { type: 'string' },
            '@type': {
              type: 'string',
              enum: [
                'gist:Person',
                'gist:Organization',
                'gist:Commitment',
                'gist:TimeInterval',
                'gist:Magnitude'
              ]
            },
            name: { type: 'string' },
            dueDate: { type: 'string' }
          },
          required: ['@id', '@type', 'name']
        }
      }
    },
    required: ['@context', '@graph']
  };
}

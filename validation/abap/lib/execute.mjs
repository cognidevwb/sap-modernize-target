import '../node_modules/.abap-generated/init.mjs';

/** Execute the transpiled ABAP method, with its own declared ABAP parameter types. */
export async function execute(name, rows, parameters) {
  const type = abap.Classes[`ZCL_ENT_${name.toUpperCase()}`];
  if (!type) throw new Error(`Unknown analytics contract: ${name}`);
  const signature = type.METHODS.CALCULATE.parameters;
  const input = {};
  for (const [key, definition] of Object.entries(signature)) {
    if (definition.parm_kind !== 'I') continue;
    const field = key.toLowerCase();
    if (field === 'rows' || field === 'orders') {
      input[field] = definition.type();
      for (const value of rows) {
        const row = input[field].getRowType().clone();
        for (const [column, cell] of Object.entries(value)) {
          if (!row.get()[column]) throw new Error(`Unexpected column: ${column}`);
          row.get()[column].set(cell);
        }
        input[field].append(row);
      }
    } else {
      if (!(field in parameters)) throw new Error(`Missing parameter: ${field}`);
      const value = parameters[field];
      input[field] = typeof value === 'string'
        ? new abap.types.Character(value.length).set(value)
        : definition.type().set(value);
    }
  }
  return (await type.calculate(input)).get();
}

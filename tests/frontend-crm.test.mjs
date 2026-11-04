import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('el CRM dispone de persistencia, migración y rutas protegidas', () => {
  const schema = readFileSync(resolve(root, 'database.sql'), 'utf8');
  const migration = readFileSync(resolve(root, 'migration_004_crm.sql'), 'utf8');
  const api = readFileSync(resolve(root, 'api/index.php'), 'utf8');

  for (const table of ['crm_customers', 'crm_interactions']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  for (const action of ['crm_customer', 'crm_customer_save', 'crm_interaction_create', 'crm_interaction_complete']) {
    assert.match(api, new RegExp(`\\$action === '${action}'`));
  }
  assert.match(api, /require_admin\(\)/);
  assert.match(api, /require_csrf\(\$b\)/);
});

test('la interfaz CRM conserva sintaxis válida y ofrece filtros, ficha e historial', () => {
  const app = readFileSync(resolve(root, 'assets/app.js'), 'utf8');
  const css = readFileSync(resolve(root, 'assets/crm.css'), 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'assets/app.js')], { encoding: 'utf8' });

  assert.equal(syntax.status, 0, syntax.stderr);
  for (const feature of ['crmSearch', 'crmSegment', 'openCrmCustomer', 'crmProfileForm', 'crmInteractionForm', 'crmExport']) {
    assert.match(app, new RegExp(feature));
  }
  assert.match(css, /\.crm-profile-layout/);
  assert.match(css, /@media\(max-width:680px\)/);
});

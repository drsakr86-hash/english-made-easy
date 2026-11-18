// مفاتيح V1 (لا تُغيَّر ولا تُحذف في V2.0) ومفاتيح V2.
export const LEGACY_KEYS = {
  words: 'k_words',
  expressions: 'k_expr',
  idioms: 'k_idioms',
  grammar: 'k_grammar',
  compound: 'k_compound', // V1 كان يقرؤه ولا يكتبه أبداً
  tab: 'tab',
};

export const KEYS = {
  schema: 'eme.schema',
  progress: 'eme.progress',
  settings: 'eme.settings',
  migration: 'eme.migration',
  backup: 'eme.backup.v1',
  preimport: 'eme.backup.preimport',
};

export const SCHEMA_VERSION = 2;
export const PROGRESS_SECTIONS = ['words', 'expressions', 'idioms', 'grammar'];

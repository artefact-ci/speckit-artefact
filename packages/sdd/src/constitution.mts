/** Vrai si le texte est encore la constitution vierge du cœur Spec Kit (aucun installeur passé). */
export function isBlankConstitution(text: string): boolean {
  return text.includes('[PROJECT_NAME]') && text.includes('[PRINCIPLE_1_NAME]');
}

/** Renseigne le nom du projet ; les autres marqueurs restent à remplir. */
export function baseConstitution(template: string, projectName: string): string {
  return template.replaceAll('[PROJECT_NAME]', () => projectName);
}

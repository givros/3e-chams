// Observable objectives complement the executable code checks.
export const objectives = {
  1: [['add-two', 'Ajoute deux exemplaires du plat principal avec le bouton +.']],
  2: [['remove-one', 'Retire un article avec le bouton −.'], ['zero', 'À zéro, clique encore sur − : la quantité doit rester à zéro.']],
  4: [['line-one', 'Observe le panier avec un exemplaire de ton plat.'], ['line-two', 'Observe le panier avec deux exemplaires de ton plat.']],
  5: [['mixed', 'Ouvre un panier contenant au moins deux plats différents.']],
  7: [['paid', 'Observe les frais sous ton seuil.'], ['free', 'Observe les frais à partir de ton seuil.']],
  8: [['promo-rejected', 'Essaie un code incorrect au-dessus de ton minimum.'], ['promo-small', 'Essaie ton code sous ton minimum.'], ['promo-accepted', 'Essaie ton code à partir de ton minimum.']],
  9: [['total-with-promo', 'Observe le total avec ta promotion.']],
  11: [['order', 'Confirme une commande avec ta livraison offerte et ta promotion.']]
};

export function normalizeProgress(state) {
  state.evidence = state.evidence && typeof state.evidence === 'object' && !Array.isArray(state.evidence) ? state.evidence : {};
  state.attempts = state.attempts && typeof state.attempts === 'object' && !Array.isArray(state.attempts) ? state.attempts : {};
  state.guidance = state.guidance && typeof state.guidance === 'object' && !Array.isArray(state.guidance) ? state.guidance : {};
  state.supportTargets = state.supportTargets && typeof state.supportTargets === 'object' && !Array.isArray(state.supportTargets) ? state.supportTargets : {};
  state.diagnostics = Array.isArray(state.diagnostics) ? state.diagnostics.filter(Number.isInteger) : [];
  state.skipped = Array.isArray(state.skipped) ? state.skipped.filter(Number.isInteger) : [];
  // Migrate existing students without making them repeat already completed work.
  for (const index of state.completed) {
    state.evidence[index] = [...new Set([...(state.evidence[index] || []), ...(objectives[index] || []).map(([key]) => key)])];
  }
  return state;
}

export function ready(state, index) {
  return (objectives[index] || []).every(([key]) => (state.evidence[index] || []).includes(key));
}

export function record(state, index, key) {
  if (!(objectives[index] || []).some(([expected]) => expected === key)) return false;
  const evidence = state.evidence[index] || (state.evidence[index] = []);
  if (evidence.includes(key)) return false;
  evidence.push(key);
  return true;
}

export function needsReview(state, index) {
  if (index === 3) return (state.attempts[1] || 0) + (state.attempts[2] || 0) >= 2 && !state.diagnostics.includes(3);
  if (index === 10) return (state.attempts[8] || 0) >= 2 && !state.diagnostics.includes(10);
  return true;
}

export function diagnosticFor(index) {
  return index === 1 || index === 2 ? 3 : index === 8 ? 10 : null;
}

export function guidanceFor(index, attempt, error, hint) {
  if (/Unexpected|Syntax|token|parenth|guillemet|defined|identifier/i.test(error)) {
    return attempt < 2
      ? 'Le code ne peut pas encore être lu. Vérifie les noms, les guillemets, puis les parenthèses et les accolades.'
      : 'Regarde uniquement la dernière partie modifiée. Un texte est entre guillemets ; une fonction a des parenthèses et des accolades ; return précède le résultat.';
  }
  const explanations = {
    0: 'Une variable texte s’écrit avec const, son nom, le signe = et un texte entre guillemets.',
    1: 'Essaie le calcul dans ta tête : si quantity vaut 3, le résultat doit être 4. Ton calcul doit utiliser quantity, pas toujours renvoyer le même nombre.',
    2: 'Sépare les deux situations : à zéro, on reste à zéro ; avec des articles, on retire exactement un article.',
    4: 'Pour 3 plats à 4 €, le montant est 12 €. Cherche l’opération qui fonctionne aussi pour 0 plat et pour 2 plats.',
    5: 'La fonction reçoit déjà les montants des trois lignes. Elle doit tous les compter, même si l’un des montants vaut zéro.',
    6: 'Teste exactement la valeur de freeDeliveryAt : la livraison doit déjà être offerte. Essaie aussi un montant juste en dessous et juste au-dessus.',
    8: 'Vérifie séparément le texte du code et ton promoMinimum. Si une seule condition est vraie, la réduction doit rester à zéro.',
    9: 'Distingue ce qui augmente le prix de ce qui le diminue : les frais s’ajoutent et la réduction se retire.'
  };
  return attempt < 3 ? explanations[index] || 'Teste le cas indiqué dans le message avant de modifier ton code.' : 'Passe à cette aide plus précise, puis teste ton propre code :\n' + hint;
}

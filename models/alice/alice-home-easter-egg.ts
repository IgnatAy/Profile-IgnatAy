// One guaranteed logo-return encounter per document. This tiny module is shared
// with the lazy companion, so clicking before its chunk loads still works.
export function createHomeEasterEgg() {
  let used = false;
  let pending = false;
  return {
    request(fromSection: string): boolean {
      if (fromSection === 'about' || used) return false;
      pending = true;
      return true;
    },
    encountered() {
      used = true;
      pending = false;
    },
    take(section: string | undefined, eligible = true): boolean {
      if (section === undefined) return false;
      const returningHome = pending && !used && section === 'about';
      // Abandoned navigation must not surprise a later unrelated home visit.
      pending = false;
      // An existing penguin must leave; that first valid return is still spent.
      if (returningHome) used = true;
      return returningHome && eligible;
    },
  };
}

export const homeEasterEgg = createHomeEasterEgg();

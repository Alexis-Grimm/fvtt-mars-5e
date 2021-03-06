/**
 * Collection of changes and additions to the different core roll, dice, term, ... classes
 */

import NumberTerm from "./number-term.js";

class Mars5eRoll extends Roll {
  constructor(formula, data = {}) {
    super(formula, data);
    this.origFormula = formula;
  }

  _splitDiceTerms(formula) {
    const terms = super._splitDiceTerms(formula);

    // make sure that number terms have the correct sign!
    return terms.map((e, idx) => {
      // transform every number to a NumberTerm, for consistenc
      if (Number.isNumeric(terms[idx + 1])) {
        terms[idx + 1] = new NumberTerm({ number: terms[idx + 1] });
      }
      if (e instanceof NumberTerm && e.number === 0 && !e.flavor) return "";
      // remove unecessary + terms infront of -, which will get overlooked by cleanterms, due to the addition of NumberTerm
      // also remove if the next one is a 0 without flavor, cause thats useless data (but increases the unreadability of this code part, so a good choice! :s)
      if (
        e === "+" &&
        (terms[idx + 1] === "-" ||
          (terms[idx + 1]?.number === 0 && !terms[idx + 1].flavor))
      )
        return "";
      if (e !== "-") return e;
      if (terms[idx + 1] instanceof NumberTerm) {
        terms[idx + 1].number *= -1;
        return "";
      }
      return e;
    });
  }

  get modifier() {
    const vals = this.terms
      .filter((e) => e instanceof NumberTerm)
      .map((e) => e.number);
    return this._safeEval(vals.join("+"));
  }

  // Do math on non dice values to combine tem into one term
  get shortenedFormula() {
    const dice = this.terms
      .filter((e) => !(e instanceof NumberTerm))
      .map((e) => (e.formula ? e.formula : e));
    const terms = this._identifyTerms(
      dice.join(" ") + "+" + (this.modifier || "")
    );
    return this.constructor.cleanFormula(terms);
  }

  get flavorFormula() {
    return this.terms
      .map((e) => {
        if (!(e instanceof DiceTerm)) return e;
        return e.formula;
      })
      .join(" ");
  }

  static replaceFormulaData(formula, data, { missing, warn = false } = {}) {
    let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
    formula = formula.replace(dataRgx, (match, term) => {
      return `${match} [${term}]`;
    });
    return super.replaceFormulaData(formula, data, { missing, warn });
  }
}

export function initRollChanges() {
  CONFIG.Dice.terms[NumberTerm.DENOMINATION] = NumberTerm;
  Roll = Mars5eRoll;
  // else chat message stuff won't work....... cause they use Roll.create and that uses the class defined here......
  CONFIG.Dice.rolls[0] = Mars5eRoll;

  const oldMatchTerm = DiceTerm.matchTerm;

  DiceTerm.matchTerm = function (expression) {
    const match = oldMatchTerm(expression);
    if (match) return match;
    const rgx = new RegExp(`^([0-9]+)${DiceTerm.FLAVOR_TEXT_REGEX}`);
    const ret = expression.match(rgx);
    if (ret) return [null, ret[1], "n", null, ret[2]]; // is sliced, number, denomination, no modifier, flavor
    return null;
  };
  // allow for spaces before the flavor.. makes it more readable!
  DiceTerm.FLAVOR_TEXT_REGEX = "(?:\\s*\\[(.*)\\])?";
}

import { getValidationMethod } from './methods';

const dontValidate = [];

export let ruleSeparator = '|';
export let ruleParamSeparator = ':';
export let paramsSeparator = ',';

/**
 * Override default rule separator
 * @param {string} separator
 */
export function setRuleSeparator(separator) {
  if (typeof separator !== 'string') {
    throw 'Separator must be string';
  }
  ruleSeparator = separator;
}

/**
 * Override default rule-params separator
 * @param {string} separator
 */
export function setRuleParamSeparator(separator) {
  if (typeof separator !== 'string') {
    throw 'Separator must be string';
  }
  ruleParamSeparator = separator;
}

/**
 * Override default params separator
 * @param {string} separator
 */
export function setParamsSeparator(separator) {
  if (typeof separator !== 'string') {
    throw 'Separator must be string';
  }
  paramsSeparator = separator;
}

function Rule(rule, params) {
  let name;
  let isFunction;
  let method;

  if (typeof rule === 'string') {
    name = rule;
    isFunction = false;
    if (dontValidate.indexOf(rule) === -1) {
      method = getValidationMethod(name);
    }
  } else if (typeof rule === 'function') {
    name = rule.name || 'default';
    isFunction = true;
    method = rule;
  }

  return {
    name,
    /**
     * @param {{}} rules
     * @param {*} value
     * @param {{}} data
     * @return {{rule: string}|boolean|*}
     */
    validate(rules, value, data) {
      if (isFunction) {
        return method(value, data);
      } else {
        return method(value, ...params);
      }
    },
  };
}

/**
 * Parse a complete scheme of rules.
 * Can contains arrays, objects and strings.
 *
 * @param {{}} ruleScheme
 * @return {{}} Parsed rules
 */
export function parseScheme(ruleScheme) {
  const rules = {};

  for (let name in ruleScheme) {
    let _ruleSet = ruleScheme[name];
    let _rules = {};

    if (typeof _ruleSet === 'string') {
      _rules = parseStringRules(_ruleSet);
    } else if (Array.isArray(_ruleSet)) {
      _rules = parseArrayRules(_ruleSet);
    } else if (typeof _ruleSet === 'object') {
      _rules = parseObjectRules(_ruleSet);
    } else {
      throw `Invalid rules for ${name}`;
    }

    for (let i = 0; i < dontValidate.length; i++) {
      delete _rules[dontValidate[i]];
    }

    rules[name] = {
      rules: Object.values(_rules),
    };
  }

  return rules;
}

/**
 * @example ['required', 'max:20', someFunction ...]
 * @param {array} ruleSet
 * @return {object}
 */
function parseArrayRules(ruleSet) {
  let rules = {};
  let i = 100;
  ruleSet.map(function (rule) {
    if (rule == null || rule === '') return;

    if (typeof rule === 'string') {
      let parsedRule = parseStringRules(rule);
      Object.assign(rules, parsedRule);
    } else if (typeof rule === 'function') {
      let _ruleName = rule.name.length > 0 ? rule.name : i++;
      rules[_ruleName] = Rule(rule);
    }
  });

  return rules;
}

/**
 * @example {required: true, in_array: [1, 2, 3, 4, 5] ... , custom: function(){}}
 * @param {object} ruleSet
 * @return {object}
 */
function parseObjectRules(ruleSet) {
  let rules = {};
  let i = 100;
  Object.keys(ruleSet).map(function (ruleName) {
    let ruleParam = ruleSet[ruleName];

    if (typeof ruleParam === 'function') {
      let _ruleName = ruleParam.name.length > 0 ? ruleParam.name : i++;
      rules[_ruleName] = Rule(ruleParam);
    } else {
      let params = Array.isArray(ruleParam) ? ruleParam : [ruleParam];
      rules[ruleName] = Rule(ruleName, params);
    }
  });

  return rules;
}

/**
 * @param {string} ruleSet
 * @return {object}
 */
function parseStringRules(ruleSet) {
  let rules = {};
  let allRules = ruleSet.split(ruleSeparator);

  allRules
    .filter(function (val) {
      return val !== '';
    })
    .map(function (r) {
      let _ruleParams = r.split(ruleParamSeparator);
      let _ruleName = _ruleParams[0].trim();

      let _params = _ruleParams[1];
      let _function_params =
        _params !== undefined ? _params.split(paramsSeparator) : [];

      rules[_ruleName] = Rule(_ruleName, _function_params);
    });

  return rules;
}

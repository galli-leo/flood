'use strict';
const diffActionTypes = require('../constants/diffActionTypes');

const objectUtil = {
  createStringMapFromArray: (array = []) => {
    return array.reduce((memo, key) => {
      memo[key] = key;

      return memo;
    }, {});
  },

  createSymbolMapFromArray: (array = []) => {
    return array.reduce((memo, key) => {
      memo[key] = Symbol(key);

      return memo;
    }, {});
  },

  getDiff: (prevObject = {}, nextObject = {}) => {
    const prevObjectKeys = Object.keys(prevObject);
    const nextObjectKeys = Object.keys(nextObject);

    let shouldCheckForRemovals = nextObjectKeys.length < prevObjectKeys.length;

    const diff = nextObjectKeys.reduce((accumulator, key) => {
      if (prevObject[key] == null) {
        shouldCheckForRemovals = true;

        accumulator.push({
          action: diffActionTypes.ITEM_ADDED,
          data: {
            [key]: nextObject[key]
          }
        });
      } else if (prevObject[key] !== nextObject[key]) {
        accumulator.push({
          action: diffActionTypes.ITEM_CHANGED,
          data: {
            [key]: nextObject[key]
          }
        });
      }

      return accumulator;
    }, []);

    if (shouldCheckForRemovals) {
      prevObjectKeys.forEach(key => {
        if (nextObject[key] == null) {
          diff.push({
            action: diffActionTypes.ITEM_REMOVED,
            data: key
          });
        }
      });
    }

    return diff;
  },

  reflect: (object) => {
    return Object.keys(object).reduce((memo, key) => {
      memo[key] = object[key];
      memo[object[key]] = key;

      return memo;
    }, {});
  }
};

module.exports = objectUtil;

'use strict';

const objectUtil = require('../../shared/util/objectUtil');

const torrentServiceEvents = [
  'FETCH_TRANSFER_SUMMARY_ERROR',
  'FETCH_TRANSFER_SUMMARY_SUCCESS',
  'TRANSFER_SUMMARY_DIFF_CHANGE'
];

module.exports = objectUtil.createSymbolMapFromArray(torrentServiceEvents);

'use strict';

const historySnapshotTypes = require('../../shared/constants/historySnapshotTypes');
const objectUtil = require('../../shared/util/objectUtil');

const torrentServiceEvents = [
  'FETCH_TRANSFER_SUMMARY_ERROR',
  'FETCH_TRANSFER_SUMMARY_SUCCESS',
  'TRANSFER_SUMMARY_DIFF_CHANGE'
].concat(
  Object.keys(historySnapshotTypes).reduce(
    (accumulator, snapshotType) => {
      accumulator.push(
        `${snapshotType}_SNAPSHOT_FULL_UPDATE`,
        `${snapshotType}_SNAPSHOT_DIFF_CHANGE`
      );

      return accumulator;
    },
    []
  )
);

console.log(torrentServiceEvents);

module.exports = objectUtil.createSymbolMapFromArray(torrentServiceEvents);

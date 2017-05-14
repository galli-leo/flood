'use strict';
const EventEmitter = require('events');
const moment = require('moment');

const client = require('../models/client');
const ClientRequestService = require('./ClientRequestService');
const config = require('../../config');
const formatUtil = require('../../shared/util/formatUtil');
const HistoryEra = require('../models/HistoryEra');
const historyServiceEvents = require('../constants/historyServiceEvents');
const objectUtil = require('../../shared/util/objectUtil');
const transferSummaryPropMap = require('../constants/transferSummaryPropMap');

let pollIntervalID = null;

const transferSummaryFetchOptions = Array
  .from(transferSummaryPropMap.keys())
  .reduce(
    (accumulator, key) => {
      const {methodCall, transformValue} = transferSummaryPropMap.get(key);

      accumulator.methodCalls.push(methodCall);
      accumulator.propLabels.push(key);
      accumulator.valueTransformations.push(transformValue);

      return accumulator;
    },
    {
      methodCalls: [],
      propLabels: [],
      valueTransformations: []
    }
  );

const processData = (opts, callback, data, error) => {
  if (error) {
    callback(null, error);
    return;
  }

  const currentTime = moment(Date.now());
  data = data.slice(data.length - config.maxHistoryStates);

  callback(data.reduce((accumulator, snapshot, index) => {
    const time = formatUtil.secondsToDuration(
      moment.duration(currentTime.diff(moment(snapshot.ts))).asSeconds()
    );

    time.ts = snapshot.ts;

    accumulator.download.push(snapshot.dn);
    accumulator.upload.push(snapshot.up);
    accumulator.timestamps.push(time);

    return accumulator;
  }, {upload: [], download: [], timestamps: []}));
};

class HistoryService extends EventEmitter {
  constructor() {
    super(...arguments);

    this.fetchCurrentTransferSummary = this.fetchCurrentTransferSummary.bind(this);
    this.handleFetchTransferSummaryError = this.handleFetchTransferSummaryError.bind(this);
    this.handleFetchTransferSummarySuccess = this.handleFetchTransferSummarySuccess.bind(this);

    this.errorCount = 0;
    this.pollTimeout = null;
    this.transferSummary = {};

    this.yearSnapshot = new HistoryEra({
      interval: 1000 * 60 * 60 * 24 * 7, // 7 days
      maxTime: 0, // infinite
      name: 'yearSnapshot'
    });

    this.monthSnapshot = new HistoryEra({
      interval: 1000 * 60 * 60 * 12, // 12 hours
      maxTime: 1000 * 60 * 60 * 24 * 365, // 365 days
      name: 'monthSnapshot',
      nextEraUpdateInterval: 1000 * 60 * 60 * 24 * 7, // 7 days
      nextEra: this.yearSnapshot
    });

    this.weekSnapshot = new HistoryEra({
      interval: 1000 * 60 * 60 * 4, // 4 hours
      maxTime: 1000 * 60 * 60 * 24 * 7 * 24, // 24 weeks
      name: 'weekSnapshot',
      nextEraUpdateInterval: 1000 * 60 * 60 * 12, // 12 hours
      nextEra: this.monthSnapshot
    });

    this.daySnapshot = new HistoryEra({
      interval: 1000 * 60 * 60, // 60 minutes
      maxTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      name: 'daySnapshot',
      nextEraUpdateInterval: 1000 * 60 * 60 * 4, // 4 hours
      nextEra: this.weekSnapshot
    });

    this.hourSnapshot = new HistoryEra({
      interval: 1000 * 60 * 15, // 15 minutes
      maxTime: 1000 * 60 * 60 * 24, // 24 hours
      name: 'hourSnapshot',
      nextEraUpdateInterval: 1000 * 60 * 60, // 60 minutes
      nextEra: this.daySnapshot
    });

    this.thirtyMinSnapshot = new HistoryEra({
      interval: 1000 * 20, // 20 seconds
      maxTime: 1000 * 60 * 30, // 30 minutes
      name: 'thirtyMinSnapshot',
      nextEraUpdateInterval: 1000 * 60 * 15, // 15 minutes
      nextEra: this.hourSnapshot
    });

    this.fiveMinSnapshot = new HistoryEra({
      interval: 1000 * 5, // 5 seconds
      maxTime: 1000 * 60 * 5, // 5 minutes
      name: 'fiveMinSnapshot',
      nextEraUpdateInterval: 1000 * 20, // 20 seconds
      nextEra: this.thirtyMinSnapshot
    });

    this.fetchCurrentTransferSummary();
  }

  deferFetchTransferSummary(interval = config.torrentClientPollInterval) {
    this.pollTimeout = setTimeout(this.fetchCurrentTransferSummary, interval);
  }

  fetchCurrentTransferSummary() {
    if (this.pollTimeout != null) {
      clearTimeout(this.pollTimeout);
    }

    ClientRequestService
      .fetchTransferSummary(transferSummaryFetchOptions)
      .then(this.handleFetchTransferSummarySuccess.bind(this))
      .catch(this.handleFetchTransferSummaryError.bind(this));
  }

  getTransferSummary() {
    return {
      id: Date.now(),
      transferSummary: this.transferSummary
    };
  }

  getHistory(opts = {}, callback) {
    const historyCallback = processData.bind(this, opts, callback);

    if (opts.snapshot === 'fiveMin') {
      this.fiveMinSnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'thirtyMin') {
      this.thirtyMinSnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'hour') {
      this.hourSnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'day') {
      this.daySnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'week') {
      this.weekSnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'month') {
      this.monthSnapshot.getData(opts, historyCallback);
    } else if (opts.snapshot === 'year') {
      this.yearSnapshot.getData(opts, historyCallback);
    }
  }

  handleFetchTransferSummarySuccess(nextTransferSummary) {
    const diff = objectUtil.getDiff(
      this.transferSummary,
      nextTransferSummary
    );

    if (diff.length > 0) {
      this.emit(
        historyServiceEvents.TRANSFER_SUMMARY_DIFF_CHANGE,
        {
          diff,
          id: Date.now()
        }
      );
    }

    this.fiveMinSnapshot.addData({
      upload: nextTransferSummary.upRate,
      download: nextTransferSummary.downRate
    });

    this.transferSummary = nextTransferSummary;

    this.deferFetchTransferSummary();

    this.errorCount = 0;
    this.emit(historyServiceEvents.FETCH_TRANSFER_SUMMARY_SUCCESS);
  }

  handleFetchTransferSummaryError(error) {
    console.trace(error);
    let nextInterval = config.torrentClientPollInterval;

    // If more than consecutive errors have occurred, then we delay the next
    // request.
    if (++this.errorCount >= 3) {
      nextInterval = Math.max(
        config.torrentClientPollInterval
          + this.errorCount
          * config.torrentClientPollInterval / 4,
        1000 * 60
      );
    }

    this.deferFetchTransferSummary(nextInterval);

    this.emit(historyServiceEvents.FETCH_TRANSFER_SUMMARY_ERROR);
  }

  // startPolling() {
  //   this.pollTimeout = setInterval(() => {
  //     client.getTransferStats((data, err) => {
  //       if (err) {
  //         return;
  //       }

  //       fiveMinSnapshot.addData({
  //         upload: data.uploadRate,
  //         download: data.downloadRate
  //       });
  //     });
  //   }, 1000 * 5);
  // }

  // stopPolling() {
  //   clearInterval(this.pollTimeout);
  //   this.pollTimeout = null;
  // }
}

module.exports = new HistoryService();

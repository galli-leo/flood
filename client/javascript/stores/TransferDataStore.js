import ActionTypes from '../constants/ActionTypes';
import AppDispatcher from '../dispatcher/AppDispatcher';
import BaseStore from './BaseStore';
import ConfigStore from './ConfigStore';
import diffActionTypes from '../../../shared/constants/diffActionTypes';
import EventTypes from '../constants/EventTypes';
import FloodActions from '../actions/FloodActions';

const pollInterval = ConfigStore.getPollInterval();
const maxHistoryStates = ConfigStore.getMaxHistoryStates();

class TransferDataStoreClass extends BaseStore {
  constructor() {
    super();

    this.pollTransferDataID = null;
    this.transferRates = {download: [], upload: []};
    this.transferSummary = {};
    this.transferTotals = {download: null, upload: null};
  }

  fetchTransferData() {
    if (!this.isRequestPending('fetch-transfer-history')) {
      this.beginRequest('fetch-transfer-history');
      FloodActions.fetchTransferHistory({
        snapshot: 'fiveMin'
      });
    }

    if (this.pollTransferDataID === null) {
      this.startPollingTransferData();
    }
  }

  getTransferTotals() {
    return this.transferTotals;
  }

  getTransferSummary() {
    return this.transferSummary;
  }

  getTransferRates() {
    return this.transferRates;
  }

  handleSetThrottleSuccess(data) {
    this.fetchTransferData();
    this.emit(EventTypes.CLIENT_SET_THROTTLE_SUCCESS);
  }

  handleSetThrottleError(error) {
    this.emit(EventTypes.CLIENT_SET_THROTTLE_ERROR);
  }

  handleFetchTransferHistoryError(error) {
    this.emit(EventTypes.CLIENT_TRANSFER_HISTORY_REQUEST_ERROR);
    this.resolveRequest('fetch-transfer-history');
  }

  handleFetchTransferHistorySuccess(transferData) {
    this.transferRates = transferData;

    this.emit(EventTypes.CLIENT_TRANSFER_HISTORY_REQUEST_SUCCESS);
    this.resolveRequest('fetch-transfer-history');
  }

  handleTransferSummaryDiffChange(diff) {
    diff.forEach(change => {
      if (change.action === diffActionTypes.ITEM_REMOVED) {
        delete this.transferSummary[change.data];
      } else {
        this.transferSummary = {
          ...this.transferSummary,
          ...change.data
        };
      }
    });

    this.emit(EventTypes.CLIENT_TRANSFER_SUMMARY_CHANGE);
  }

  handleTransferSummaryFullUpdate(transferSummary) {
    this.transferSummary = transferSummary;

    this.emit(EventTypes.CLIENT_TRANSFER_SUMMARY_CHANGE);
  }

  startPollingTransferData() {
    this.pollTransferDataID = setInterval(
      this.fetchTransferData.bind(this),
      pollInterval
    );
  }
}

let TransferDataStore = new TransferDataStoreClass();

TransferDataStore.dispatcherID = AppDispatcher.register((payload) => {
  const {action, source} = payload;

  switch (action.type) {
    case ActionTypes.TRANSFER_SUMMARY_DIFF_CHANGE:
      TransferDataStore.handleTransferSummaryDiffChange(action.data);
      break;
    case ActionTypes.TRANSFER_SUMMARY_FULL_UPDATE:
      TransferDataStore.handleTransferSummaryFullUpdate(action.data);
      break;
    case ActionTypes.CLIENT_SET_THROTTLE_SUCCESS:
      TransferDataStore.handleSetThrottleSuccess(action.data.transferData);
      break;
    case ActionTypes.CLIENT_SET_THROTTLE_ERROR:
      TransferDataStore.handleSetThrottleError(action.data.error);
      break;
    case ActionTypes.CLIENT_FETCH_TRANSFER_HISTORY_ERROR:
      TransferDataStore.handleFetchTransferHistoryError(action.error);
      break;
    case ActionTypes.CLIENT_FETCH_TRANSFER_HISTORY_SUCCESS:
      TransferDataStore.handleFetchTransferHistorySuccess(action.data);
      break;
  }
});

export default TransferDataStore;

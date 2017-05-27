'use strict';

const HistoryService = require('../services/HistoryService');
const historyServiceEvents = require('../constants/historyServiceEvents');
const historySnapshotTypes = require('../../shared/constants/historySnapshotTypes');
const ServerEvent = require('../models/ServerEvent');
const serverEventTypes = require('../../shared/constants/serverEventTypes');
const TaxonomyService = require('../services/TaxonomyService');
const taxonomyServiceEvents = require('../constants/taxonomyServiceEvents');
const TorrentService = require('../services/TorrentService');
const torrentServiceEvents = require('../constants/torrentServiceEvents');

module.exports = function (req, res, next) {
  const {query: {historySnapshot = historySnapshotTypes.FIVE_MINUTE}} = req;

  const serverEvent = new ServerEvent(res);
  const taxonomy = TaxonomyService.getTaxonomy();
  const torrentList = TorrentService.getTorrentList();
  const transferSummary = HistoryService.getTransferSummary();

  // Remove all previous event listeners.
  HistoryService.removeAllListeners();
  TaxonomyService.removeAllListeners();
  TorrentService.removeAllListeners();

  // Emit all existing data.
  serverEvent.setID(torrentList.id);
  serverEvent.setType(serverEventTypes.TORRENT_LIST_FULL_UPDATE);
  serverEvent.addData(torrentList.torrents);
  serverEvent.emit();

  serverEvent.setID(taxonomy.id);
  serverEvent.setType(serverEventTypes.TAXONOMY_FULL_UPDATE);
  serverEvent.addData(taxonomy.taxonomy);
  serverEvent.emit();

  serverEvent.setID(transferSummary.id);
  serverEvent.setType(serverEventTypes.TRANSFER_SUMMARY_FULL_UPDATE);
  serverEvent.addData(transferSummary.transferSummary);
  serverEvent.emit();

  // TODO: Handle empty or sub-optimal history states.
  // Get user's specified history snapshot current history.
  HistoryService.getHistory({snapshot: historySnapshot}, (snapshot, error) => {
    const {timestamps: lastTimestamps = []} = snapshot;
    const lastTimestamp = lastTimestamps[lastTimestamps.length - 1];

    if (error == null) {
      serverEvent.setID(lastTimestamp);
      serverEvent.setType(serverEventTypes.TRANSFER_HISTORY_FULL_UPDATE);
      serverEvent.addData(snapshot);
      serverEvent.emit();
    }
  });

  // Add user's specified history snapshot change event listener.
  HistoryService.on(
    historyServiceEvents[
      `${historySnapshotTypes[historySnapshot]}_SNAPSHOT_FULL_UPDATE`
    ],
    payload => {
      const {data, id} = payload;

      serverEvent.setID(id);
      serverEvent.setType(serverEventTypes.TRANSFER_HISTORY_FULL_UPDATE);
      serverEvent.addData(data);
      serverEvent.emit();
    }
  );

  // Add diff event listeners.
  HistoryService.on(
    historyServiceEvents.TRANSFER_SUMMARY_DIFF_CHANGE,
    (payload) => {
      const {diff, id} = payload;

      serverEvent.setID(id);
      serverEvent.setType(serverEventTypes.TRANSFER_SUMMARY_DIFF_CHANGE);
      serverEvent.addData(diff);
      serverEvent.emit();
    }
  );

  TaxonomyService.on(
    taxonomyServiceEvents.TAXONOMY_DIFF_CHANGE,
    (payload) => {
      const {diff, id} = payload;

      serverEvent.setID(id);
      serverEvent.setType(serverEventTypes.TAXONOMY_DIFF_CHANGE);
      serverEvent.addData(diff);
      serverEvent.emit();
    }
  );

  TorrentService.on(
    torrentServiceEvents.TORRENT_LIST_DIFF_CHANGE,
    (payload) => {
      const {diff, id} = payload;

      serverEvent.setID(id);
      serverEvent.setType(serverEventTypes.TORRENT_LIST_DIFF_CHANGE);
      serverEvent.addData(diff);
      serverEvent.emit();
    }
  );
};

'use strict';

const express = require('express');
const passport = require('passport');
const router = express.Router();

const ajaxUtil = require('../util/ajaxUtil');
const client = require('../models/client');
const clientRoutes = require('./client');
const eventStream = require('../middleware/eventStream');
const FeedCollection = require('../models/FeedCollection');
const Filesystem = require('../models/Filesystem');
const history = require('../models/history');
const HistoryService = require('../services/HistoryService');
const historyServiceEvents = require('../constants/historyServiceEvents');
const mediainfo = require('../util/mediainfo');
const NotificationCollection = require('../models/NotificationCollection');
const ServerEvent = require('../models/ServerEvent');
const serverEventTypes = require('../../shared/constants/serverEventTypes');
const settings = require('../models/settings');
const TaxonomyService = require('../services/TaxonomyService');
const taxonomyServiceEvents = require('../constants/taxonomyServiceEvents');
const TorrentService = require('../services/TorrentService');
const torrentServiceEvents = require('../constants/torrentServiceEvents');

router.use('/', passport.authenticate('jwt', {session: false}));

router.get('/activity-stream', eventStream, function(req, res, next) {
  const transferSummary = HistoryService.getTransferSummary();
  const taxonomy = TaxonomyService.getTaxonomy();
  const torrentList = TorrentService.getTorrentList();
  const serverEvent = new ServerEvent(res);

  serverEvent.setID(torrentList.id);
  serverEvent.setType(serverEventTypes.TORRENT_LIST_FULL_UPDATE);
  serverEvent.addData(torrentList.torrents);
  serverEvent.emit();

  serverEvent.setID(transferSummary.id);
  serverEvent.setType(serverEventTypes.TRANSFER_SUMMARY_FULL_UPDATE);
  serverEvent.addData(transferSummary.transferSummary);
  serverEvent.emit();

  serverEvent.setID(taxonomy.id);
  serverEvent.setType(serverEventTypes.TAXONOMY_FULL_UPDATE);
  serverEvent.addData(taxonomy.taxonomy);
  serverEvent.emit();

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
});

router.use('/client', clientRoutes);

router.get('/download', (req, res, next) => {
  client.downloadFiles(req.query.hash, req.query.files, res);
});

router.delete('/feed-monitor/:id', (req, res, next) => {
  FeedCollection.removeItem(req.params.id, ajaxUtil.getResponseFn(res));
});

router.get('/feed-monitor', (req, res, next) => {
  FeedCollection.getAll(req.body.query, ajaxUtil.getResponseFn(res));
});

router.get('/feed-monitor/feeds', (req, res, next) => {
  FeedCollection.getFeeds(req.body.query, ajaxUtil.getResponseFn(res));
});

router.put('/feed-monitor/feeds', (req, res, next) => {
  FeedCollection.addFeed(req.body, ajaxUtil.getResponseFn(res));
});

router.get('/feed-monitor/rules', (req, res, next) => {
  FeedCollection.getRules(req.body.query, ajaxUtil.getResponseFn(res));
});

router.put('/feed-monitor/rules', (req, res, next) => {
  FeedCollection.addRule(req.body, ajaxUtil.getResponseFn(res));
});

router.get('/directory-list', (req, res, next) => {
  Filesystem.getDirectoryList(req.query, ajaxUtil.getResponseFn(res));
});

router.get('/history', (req, res, next) => {
  HistoryService.getHistory(req.query, ajaxUtil.getResponseFn(res));
});

router.get('/mediainfo', (req, res, next) => {
  mediainfo.getMediainfo(req.query, ajaxUtil.getResponseFn(res));
});

router.get('/notifications', (req, res, next) => {
  NotificationCollection.getNotifications(req.query, ajaxUtil.getResponseFn(res));
});

router.delete('/notifications', (req, res, next) => {
  NotificationCollection.clearNotifications(req.query, ajaxUtil.getResponseFn(res));
});

router.get('/settings', (req, res, next) => {
  settings.get(req.query, ajaxUtil.getResponseFn(res));
});

router.patch('/settings', (req, res, next) => {
  settings.set(req.body, ajaxUtil.getResponseFn(res));
});

router.get('/stats', (req, res, next) => {
  client.getTransferStats(ajaxUtil.getResponseFn(res));
});

module.exports = router;

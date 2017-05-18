import axios from 'axios';

import AppDispatcher from '../dispatcher/AppDispatcher';
import ActionTypes from '../constants/ActionTypes';
import AuthStore from '../stores/AuthStore';
import ConfigStore from '../stores/ConfigStore';
import serverEventTypes from '../../../shared/constants/serverEventTypes';

const baseURI = ConfigStore.getBaseURI();

let isEventSourceInitialized = false;

const FloodActions = {
  clearNotifications: (options) => {
    return axios.delete(`${baseURI}api/notifications`)
      .then((json = {}) => {
        return json.data;
      })
      .then((response = {}) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_CLEAR_NOTIFICATIONS_SUCCESS,
          data: {
            ...response,
            ...options
          }
        });
      }, (error) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_CLEAR_NOTIFICATIONS_ERROR,
          data: {
            error
          }
        });
      });
  },

  fetchDirectoryList: (options = {}) => {
    return axios.get(`${baseURI}api/directory-list`, {
        params: options
      })
      .then((json = {}) => {
        return json.data;
      })
      .then((response) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_DIRECTORY_LIST_SUCCESS,
          data: {
            ...options,
            ...response
          }
        });
      }, (error = {}) => {
        const {response: errorData} = error;

        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_DIRECTORY_LIST_ERROR,
          error: errorData
        });
      });
  },

  fetchMediainfo: (options) => {
    return axios.get(`${baseURI}api/mediainfo`, {
        params: {
          hash: options.hash
        }
      })
      .then((json = {}) => {
        return json.data;
      })
      .then((response) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_MEDIAINFO_SUCCESS,
          data: {
            ...response,
            ...options
          }
        });
      }, (error) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_MEDIAINFO_ERROR,
          error
        });
      });
  },

  fetchNotifications: (options) => {
    return axios.get(`${baseURI}api/notifications`, {
        params: {
          limit: options.limit,
          start: options.start
        }
      })
      .then((json = {}) => {
        return json.data;
      })
      .then((response) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_NOTIFICATIONS_SUCCESS,
          data: {
            ...response,
            ...options
          }
        });
      }, (error) => {
        AppDispatcher.dispatchServerAction({
          type: ActionTypes.FLOOD_FETCH_NOTIFICATIONS_ERROR,
          data: {
            error
          }
        });
      });
  },

  fetchTransferHistory: (opts) => {
    return axios.get(`${baseURI}api/history`, {
      params: opts
    })
    .then((json = {}) => {
      return json.data;
    })
    .then((data) => {
      AppDispatcher.dispatchServerAction({
        type: ActionTypes.CLIENT_FETCH_TRANSFER_HISTORY_SUCCESS,
        data
      });
    }, (error) => {
      AppDispatcher.dispatchServerAction({
        type: ActionTypes.CLIENT_FETCH_TRANSFER_HISTORY_ERROR,
        error
      });
    });
  },

  startTorrentListStream: () => {
    if (!isEventSourceInitialized) {
      const source = new EventSource(`${baseURI}api/activity-stream`);

      source.addEventListener(
        serverEventTypes.TORRENT_LIST_DIFF_CHANGE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TORRENT_LIST_DIFF_CHANGE,
            data: JSON.parse(event.data)
          });
        }
      );

      source.addEventListener(
        serverEventTypes.TORRENT_LIST_FULL_UPDATE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TORRENT_LIST_FULL_UPDATE,
            data: JSON.parse(event.data)
          });
        }
      );

      source.addEventListener(
        serverEventTypes.TAXONOMY_DIFF_CHANGE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TAXONOMY_DIFF_CHANGE,
            data: JSON.parse(event.data)
          });
        }
      );

      source.addEventListener(
        serverEventTypes.TAXONOMY_FULL_UPDATE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TAXONOMY_FULL_UPDATE,
            data: JSON.parse(event.data)
          });
        }
      );

      source.addEventListener(
        serverEventTypes.TRANSFER_SUMMARY_DIFF_CHANGE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TRANSFER_SUMMARY_DIFF_CHANGE,
            data: JSON.parse(event.data)
          });
        }
      );

      source.addEventListener(
        serverEventTypes.TRANSFER_SUMMARY_FULL_UPDATE,
        (event) => {
          AppDispatcher.dispatchServerAction({
            type: ActionTypes.TRANSFER_SUMMARY_FULL_UPDATE,
            data: JSON.parse(event.data)
          });
        }
      );

      isEventSourceInitialized = true;
    }
  },
};

export default FloodActions;

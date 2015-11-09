import { connect } from 'react-redux';
import React from 'react';

import ClientStats from '../components/sidebar/ClientStats';
import { setTorrentsFilter, setTorrentsSearch } from '../actions/UIActions';
import StatusFilters from '../components/sidebar/StatusFilters';
import SearchBox from '../components/sidebar/SearchBox';
import UIActions from '../actions/UIActions';
import uiSelector from '../selectors/uiSelector';

const methodsToBind = [
  'handleFilterChange',
  'handleSearchChange'
];

class Sidebar extends React.Component {

  constructor() {
    super();

    methodsToBind.forEach((method) => {
      this[method] = this[method].bind(this);
    });
  }

  handleFilterChange(value) {
    this.props.dispatch(setTorrentsFilter(value));
  }

  handleSearchChange(value) {
    this.props.dispatch(setTorrentsSearch(value));
  }

  render() {
    return (
      <aside className="sidebar">
        <ClientStats transferData={this.props.transferData} />
        <SearchBox handleSearchChange={this.handleSearchChange} />
        <StatusFilters handleFilterChange={this.handleFilterChange}
          activeFilter={this.props.torrentList.filterBy} />
      </aside>
    );
  }

}

export default connect(uiSelector)(Sidebar);

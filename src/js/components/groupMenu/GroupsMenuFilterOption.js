import React from 'react';
import PropTypes from 'prop-types';

class GroupsMenuFilterOption extends React.Component {

  handleCheckboxChange() {
    this.props.toggleFilter(this.props.name);
  }

  render() {
    const {
      name,
      text,
      icon,
      checked,
      disabled
    } = this.props;
    return (
      <label className={"option"+(disabled?" disabled":"")}>
        <span className="option-checkbox">
          <input type="checkbox" name={name} checked={checked} disabled={disabled} onChange={this.handleCheckboxChange.bind(this)} />
        </span>
        <span className="option-icon">
          {icon}
        </span>
        <span className="option-text">
          {text}
        </span>
      </label>
    );
  }
}

GroupsMenuFilterOption.defaultProps = {
  checked: false,
  disabled: false
};

GroupsMenuFilterOption.propTypes = {
  name: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  icon: PropTypes.object.isRequired,
  toggleFilter: PropTypes.func.isRequired,
  checked: PropTypes.bool,
  disabled: PropTypes.bool
};

export default GroupsMenuFilterOption;

'use strict'

const lodash = require('lodash')
const changeCase = require('change-case')

const PAYMENT_STATE_DESCRIPTIONS = {
  'created': 'Service created payment',
  'started': 'User entering card details',
  'submitted': 'User submitted card details',
  'success': 'Payment successful',
  'error': 'Error processing payment',
  'failed': 'User failed to complete payment',
  'cancelled': 'Service cancelled payment'
}
const REFUND_STATE_DESCRIPTIONS = {
  'submitted': 'Refund submitted',
  'error': 'Error processing refund',
  'success': 'Refund successful'
}

const ERROR_CODE_TO_STATE = {
  'P0010': 'Declined',
  'P0020': 'Timed out',
  'P0030': 'Cancelled',
  'P0040': 'Cancelled',
  'P0050': 'Error'
}

const CHARGE_STATES_IN_PROGRESS = {
  'created': 'In progress',
  'started': 'In progress',
  'submitted': 'In progress',
  'success': 'Payment successful',
  'error': 'Error processing payment',
  'failed': 'User failed to complete payment',
  'cancelled': 'Service cancelled payment'
}

const CHARGE_STATES_FILTER = {
  'In progress': 'In progress',
  'success': 'Payment successful',
  'error': 'Error processing payment',
  'failed': 'User failed to complete payment',
  'cancelled': 'Service cancelled payment'
}

exports.payment_states = () => Object.keys(PAYMENT_STATE_DESCRIPTIONS).map(key => toSelectorObject('PAYMENT', key))
exports.refund_states = () => Object.keys(REFUND_STATE_DESCRIPTIONS).map(key => toSelectorObject('REFUND', key))
exports.states = () => [...exports.payment_states(), ...exports.refund_states()]

exports.new_payment_states = () => Object.keys(CHARGE_STATES_FILTER).map(key => toSelectorObject('PAYMENT', key))
exports.new_states = () => [...exports.new_payment_states(), ...exports.refund_states()]

exports.getDisplayNameWithErrorMapping = (state, type = 'payment', displayNewStatesEnabled = false) => {
  let origin = exports.states().find(event => event.name === state.status.toLowerCase() && event.type === type.toLowerCase())
  let originFormatted = lodash.get(origin, `value.text`, changeCase.upperCaseFirst(state.status.toLowerCase()))
  if (!displayNewStatesEnabled) {
    return originFormatted
  } else {
    if (state.code) {
      if (ERROR_CODE_TO_STATE[state.code]) {
        return ERROR_CODE_TO_STATE[state.code]
      }
    }
    origin = exports.new_payment_states().find(event => event.name === state.status.toLowerCase() && event.type === type.toLowerCase())
    originFormatted = lodash.get(origin, `value.text`, changeCase.upperCaseFirst(state.status.toLowerCase()))
    return originFormatted
  }
}

exports.getStateFilters = (displayNewStatesEnabled = false) => {
  return displayNewStatesEnabled ? exports.new_payment_states().map(state => changeCase.upperCaseFirst(state)) : exports.states().map(state => changeCase.upperCaseFirst(state))
}

function toSelectorObject (type = '', name = '') {
  return {
    type: type.toLowerCase(),
    name: name.toLowerCase(),
    key: `${type.toLowerCase()}-${name.toLowerCase()}`,
    value: {
      text: changeCase.upperCaseFirst((type.toLowerCase() === 'refund' ? 'refund ' : '') + name.toLowerCase())
    }
  }
}

'use strict'

const lodash = require('lodash')
const changeCase = require('change-case')
const dates = require('../utils/dates.js')
const router = require('../routes.js')
const qs = require('qs')
const currencyFormatter = require('currency-formatter')
const Paginator = require('./paginator')
const states = require('./states')
const check = require('check-types')
const url = require('url')
const TransactionEvent = require('../models/TransactionEvent.class')

const DATA_UNAVAILABLE = 'Data unavailable'
const PAGINATION_SPREAD = 2
const CSV_MAX_LIMIT = process.env.CSV_MAX_LIMIT || 10000

module.exports = {
  /** prepares the transaction list view */
  buildPaymentList: function (connectorData, allCards, gatewayAccountId, filtersResult) {
    connectorData.filters = filtersResult
    connectorData.hasFilters = Object.keys(filtersResult).length !== 0
    connectorData.hasResults = connectorData.results.length !== 0
    connectorData.total = connectorData.total || (connectorData.results && connectorData.results.length)
    connectorData.showCsvDownload = connectorData.total <= CSV_MAX_LIMIT
    connectorData.totalFormatted = connectorData.total.toLocaleString()
    connectorData.csvMaxLimitFormatted = parseInt(CSV_MAX_LIMIT).toLocaleString()
    connectorData.paginationLinks = getPaginationLinks(connectorData)
    connectorData.hasPaginationLinks = !!getPaginationLinks(connectorData)

    connectorData.hasPageSizeLinks = hasPageSizeLinks(connectorData)
    connectorData.pageSizeLinks = getPageSizeLinks(connectorData)

    connectorData.cardBrands = lodash.uniqBy(allCards.card_types, 'brand')
      .map((card) => {
        let value = {}
        value.text = card.label
        if (card.brand === filtersResult.brand) {
          value.selected = true
        }
        return {'key': card.brand, 'value': value}
      })

    connectorData.results.forEach(element => {
      if (filtersResult.newChargeStatusEnabled) {
        element.state_friendly = states.getDisplayNameForConnectorState(element.state, element.transaction_type)
      } else {
        element.state_friendly = states.old_getDisplayName(element.transaction_type, element.state.status)
      }
      element.amount = asGBP(element.amount)
      element.email = (element.email && element.email.length > 20) ? element.email.substring(0, 20) + '...' : element.email
      element.updated = dates.utcToDisplay(element.updated)
      element.created = dates.utcToDisplay(element.created_date)
      element.gateway_account_id = gatewayAccountId
      element.link = router.generateRoute(router.paths.transactions.detail, {
        chargeId: element.charge_id
      })
      if (element.transaction_type && element.transaction_type.toLowerCase() === 'refund') {
        element.amount = `–${element.amount}`
      }
      delete element.created_date
    })

    // TODO normalise fromDate and ToDate so you can just pass them through no problem
    connectorData.downloadTransactionLink = router.generateRoute(
      router.paths.transactions.download, {
        reference: filtersResult.reference,
        email: filtersResult.email,
        payment_states: filtersResult.payment_states,
        refund_states: filtersResult.refund_states,
        brand: filtersResult.brand,
        fromDate: filtersResult.fromDate,
        toDate: filtersResult.toDate,
        fromTime: filtersResult.fromTime,
        toTime: filtersResult.toTime
      })

    return connectorData
  },

  buildPaymentView: function (chargeData, eventsData, users = [], newChargeStatusEnabled = false) {
    if (newChargeStatusEnabled) {
      chargeData.state_friendly = states.getDisplayNameForConnectorState(chargeData.state, chargeData.transaction_type)
    } else {
      chargeData.state_friendly = states.old_getDisplayName(chargeData.transaction_type, chargeData.state.status)
    }

    chargeData.amount = asGBP(chargeData.amount)

    if (chargeData.card_details) {
      if (chargeData.card_details.card_brand == null) chargeData.card_details.card_brand = DATA_UNAVAILABLE
      if (chargeData.card_details.cardholder_name == null) chargeData.card_details.cardholder_name = DATA_UNAVAILABLE
      if (chargeData.card_details.expiry_date == null) chargeData.card_details.expiry_date = DATA_UNAVAILABLE
      if (chargeData.card_details.last_digits_card_number == null) chargeData.card_details.last_digits_card_number = '****'
    } else {
      chargeData.card_details = {
        card_brand: DATA_UNAVAILABLE,
        cardholder_name: DATA_UNAVAILABLE,
        expiry_date: DATA_UNAVAILABLE,
        last_digits_card_number: '****'
      }
    }

    chargeData.refundable = chargeData.refund_summary.status === 'available'
    chargeData.net_amount = (chargeData.refund_summary.amount_available / 100).toFixed(2)
    chargeData.refunded_amount = asGBP(chargeData.refund_summary.amount_submitted)
    chargeData.refunded = chargeData.refund_summary.amount_submitted !== 0
    chargeData.net_amount_display = asGBP(chargeData.refund_summary.amount_available)

    chargeData.payment_provider = changeCase.upperCaseFirst(chargeData.payment_provider)
    chargeData.updated = dates.utcToDisplay(eventsData.events[0] && eventsData.events[0].updated)
    chargeData.events = eventsData.events.map(eventData => new TransactionEvent(eventData, newChargeStatusEnabled)).reverse()
    chargeData.events.forEach(event => {
      if (event.submitted_by && event.state_friendly === 'Refund submitted') {
        event.submitted_by_friendly = lodash.get(users.find(user => user.externalId === event.submitted_by) || {}, 'email')
      }
    })
    delete chargeData['links']
    delete chargeData['return_url']
    return chargeData
  }
}

function asGBP (amountInPence) {
  return currencyFormatter.format((amountInPence / 100).toFixed(2), {code: 'GBP'})
}

function getPaginationLinks (connectorData) {
  if (connectorData.total) {
    let paginator = new Paginator(connectorData.total, getCurrentPageSize(connectorData), getCurrentPageNumber(connectorData))
    return paginator.getLast() > 1 ? paginator.getNamedCentredRange(PAGINATION_SPREAD, true, true) : null
  }
}

function getPageSizeLinks (connectorData) {
  if (getCurrentPageSize(connectorData)) {
    let paginator = new Paginator(connectorData.total, getCurrentPageSize(connectorData), getCurrentPageNumber(connectorData))
    return paginator.getDisplaySizeOptions()
  }
}

function getCurrentPageNumber (connectorData) {
  return connectorData.page
}

function getCurrentPageSize (connectorData) {
  let selfLink = connectorData._links && connectorData._links.self
  let queryString
  let limit

  if (selfLink) {
    queryString = url.parse(selfLink.href).query
    limit = Number(qs.parse(queryString).display_size)
    if (check.number(limit) && limit > 0) {
      return limit
    }
  }
}

function hasPageSizeLinks (connectorData) {
  let paginator = new Paginator(connectorData.total, getCurrentPageSize(connectorData), getCurrentPageNumber(connectorData))
  return paginator.showDisplaySizeLinks()
}

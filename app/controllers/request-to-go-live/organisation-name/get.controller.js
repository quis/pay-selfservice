'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const goLiveStage = require('../../../models/go-live-stage')
const { requestToGoLive } = require('../../../paths')
const response = require('../../../utils/response')

module.exports = (req, res) => {
  // redirect on wrong stage
  if (req.service.currentGoLiveStage !== goLiveStage.NOT_STARTED) {
    return res.redirect(
      303,
      requestToGoLive.index.replace(':externalServiceId', req.service.externalId)
    )
  }
  // initialise pageData
  let pageData = lodash.get(req, 'session.pageData.requestToGoLive.organisationName')
  if (pageData) {
    delete req.session.pageData.requestToGoLive.organisationName
  } else {
    pageData = {
      organisationName: lodash.get(req, 'service.merchantDetails.name', '')
    }
  }
  // render
  return response.response(req, res, 'request-to-go-live/organisation-name', pageData)
}

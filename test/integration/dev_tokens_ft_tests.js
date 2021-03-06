var path = require('path')
require(path.join(__dirname, '/../test_helpers/serialize_mock.js'))
var userCreator = require(path.join(__dirname, '/../test_helpers/user_creator.js'))
var request = require('supertest')
var getApp = require(path.join(__dirname, '/../../server.js')).getApp
var nock = require('nock')
var csrf = require('csrf')
var paths = require(path.join(__dirname, '/../../app/paths.js'))
var session = require(path.join(__dirname, '/../test_helpers/mock_session.js'))
var {expect} = require('chai')

var gatewayAccountId = '98344'
var TOKEN = '00112233'
var PUBLIC_AUTH_PATH = '/v1/frontend/auth'
var CONNECTOR_PATH = '/v1/api/accounts/{accountId}'

var app

var requestId = 'unique-request-id'
var aCorrelationHeader = {
  reqheaders: {'x-request-id': requestId}
}

var connectorMock = nock(process.env.CONNECTOR_URL, aCorrelationHeader)
var directDebitConnectorMock = nock(process.env.DIRECT_DEBIT_CONNECTOR_URL, aCorrelationHeader)
var publicauthMock = nock(process.env.PUBLIC_AUTH_BASE, aCorrelationHeader)

function buildGetRequest (path) {
  return request(app)
    .get(path)
    .set('Accept', 'application/json')
    .set('x-request-id', requestId)
}

function buildFormPostRequest (path, sendData, sendCSRF) {
  sendCSRF = (sendCSRF === undefined) ? true : sendCSRF
  if (sendCSRF) {
    sendData.csrfToken = csrf().create('123')
  }

  return request(app)
    .post(path)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('x-request-id', requestId)
    .send(sendData)
}

function buildPutRequest (sendCSRF) {
  var data = {}
  sendCSRF = (sendCSRF === undefined) ? true : sendCSRF
  if (sendCSRF) {
    data.csrfToken = csrf().create('123')
  }
  data.token_link = '550e8400-e29b-41d4-a716-446655440000'
  data.description = 'token description'
  return request(app)
    .put(paths.apiKeys.index)
    .set('Accept', 'application/json')
    .set('x-request-id', requestId)
    .send(data)
}

describe('Dev Tokens Endpoints', function () {
  describe('The /tokens/revoked endpoint (read revoked tokens)', function () {
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens-revoked:read'
      var user = session.getUser({
        gateway_account_ids: [gatewayAccountId], permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should return an empty list of tokens if no tokens have been revoked yet', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId + '?state=revoked')
        .reply(200, {
          'account_id': gatewayAccountId
        })

      buildGetRequest(paths.apiKeys.revoked)
        .expect(200)
        .expect(response => {
          expect(response.body.tokens).to.be.empty // eslint-disable-line
        })
        .end(done)
    })

    it('should return the account_id and the token list for the only revoked token', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId + '?state=revoked')
        .reply(200, {
          'account_id': gatewayAccountId,
          'tokens': [{
            'token_link': '550e8400-e29b-41d4-a716-446655440000',
            'description': 'token 1',
            'revoked': '18 Oct 2015'
          }]
        })

      buildGetRequest(paths.apiKeys.revoked)
        .expect(function (res) {
          if (!res.body.tokens[0].csrfToken) throw new Error('no token')
          delete res.body.tokens[0].csrfToken
        })
        .expect(response => {
          expect(response.body.tokens).to.be.deep.equal([{
            'token_link': '550e8400-e29b-41d4-a716-446655440000',
            'description': 'token 1',
            'revoked': '18 Oct 2015'
          }])
        })
        .end(done)
    })

    it('should return the account_id and the token list for multiple revoked tokens', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId + '?state=revoked')
        .reply(200, {
          'account_id': gatewayAccountId,
          'tokens': [{
            'token_link': '550e8400-e29b-41d4-a716-446655440000',
            'description': 'description token 1',
            'revoked': '18 Oct 2015'
          },
          {
            'token_link': '550e8400-e29b-41d4-a716-446655441234',
            'description': 'description token 2',
            'revoked': '19 Oct 2015'
          }]
        })

      buildGetRequest(paths.apiKeys.revoked)
        .expect(function (res) {
          if (!res.body.tokens[0].csrfToken) throw new Error('no token')
          delete res.body.tokens[0].csrfToken
          if (!res.body.tokens[1].csrfToken) throw new Error('no token')
          delete res.body.tokens[1].csrfToken
        })
        .expect(response => {
          expect(response.body.tokens).to.be.deep.equal([{
            'token_link': '550e8400-e29b-41d4-a716-446655440000',
            'description': 'description token 1',
            'revoked': '18 Oct 2015'
          },
          {
            'token_link': '550e8400-e29b-41d4-a716-446655441234',
            'description': 'description token 2',
            'revoked': '19 Oct 2015'
          }])
        })
        .end(done)
    })
  })

  describe('The GET /tokens endpoint (read active tokens)', function () {
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens-active:read'
      var user = session.getUser({
        gateway_account_ids: [gatewayAccountId], permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should return an empty list of tokens if no tokens have been issued yet', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId)
        .reply(200, {
          'account_id': gatewayAccountId
        })

      buildGetRequest(paths.apiKeys.index)
        .expect(response => {
          expect(response.body.tokens).to.be.empty // eslint-disable-line
        })
        .end(done)
    })

    it('should return the account_id and the token list for the only already-issued token', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId)
        .reply(200, {
          'account_id': gatewayAccountId,
          'tokens': [{'token_link': '550e8400-e29b-41d4-a716-446655440000', 'description': 'token 1'}]
        })

      buildGetRequest(paths.apiKeys.index)
        .expect(function (res) {
          if (!res.body.tokens[0].csrfToken) throw new Error('no token')
          delete res.body.tokens[0].csrfToken
        })
        .expect(response => {
          expect(response.body.tokens).to.be.deep.equal([{
            'token_link': '550e8400-e29b-41d4-a716-446655440000',
            'description': 'token 1'
          }])
        })
        .end(done)
    })

    it('should return the account_id and the token list for already-issued tokens', function (done) {
      publicauthMock.get(PUBLIC_AUTH_PATH + '/' + gatewayAccountId)
        .reply(200, {
          'account_id': gatewayAccountId,
          'tokens': [{'token_link': '550e8400-e29b-41d4-a716-446655440000', 'description': 'description token 1'},
            {'token_link': '550e8400-e29b-41d4-a716-446655441234', 'description': 'description token 2'}]
        })

      buildGetRequest(paths.apiKeys.index)
        .expect(function (res) {
          if (!res.body.tokens[0].csrfToken) throw new Error('no token')
          delete res.body.tokens[0].csrfToken
          if (!res.body.tokens[1].csrfToken) throw new Error('no token')
          delete res.body.tokens[1].csrfToken
        })
        .expect(response => {
          expect(response.body.tokens).to.be.deep.equal([
            {'token_link': '550e8400-e29b-41d4-a716-446655440000', 'description': 'description token 1'},
            {'token_link': '550e8400-e29b-41d4-a716-446655441234', 'description': 'description token 2'}
          ])
        })
        .end(done)
    })
  })

  describe('The PUT /tokens endpoint (update token - description)', function () {
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens:update'
      var user = session.getUser({
        gateway_account_id: gatewayAccountId, permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should update the description', function (done) {
      publicauthMock.put(PUBLIC_AUTH_PATH, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000',
        'description': 'token description'
      }).reply(200, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000',
        'description': 'token description',
        'created_by': 'test-user',
        'issued_date': '18 Feb 2016 - 12:44',
        'last_used': '23 Feb 2016 - 19:44'
      })

      buildPutRequest()
        .expect(function (res) {
          if (!res.body.token.csrfToken) throw new Error('no token')
          delete res.body.token.csrfToken
        })
        .expect(result => {
          expect(result.body.token.description).to.equal('token description')
        })
        .end(done)
    })

    it('should not update the description without csrf', function (done) {
      publicauthMock.put(PUBLIC_AUTH_PATH, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000',
        'description': 'token description'
      }).reply(200, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000',
        'description': 'token description'
      })

      buildPutRequest(false)
        .expect(400, {
          'message': 'There is a problem with the payments platform'
        })
        .end(done)
    })

    it('should forward the error status code when updating the description', function (done) {
      publicauthMock.put(PUBLIC_AUTH_PATH, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000',
        'description': 'token description'
      }).reply(400, {})

      buildPutRequest()
        .expect(400, {})
        .end(done)
    })

    it('should send 500 if any error happens while updating the resource', function (done) {
      // No serverMock defined on purpose to mock a network failure
      buildPutRequest()
        .expect(500, {})
        .end(done)
    })
  })
  describe('The DELETE /tokens endpoint (delete tokens)', function () {
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens:delete'
      var user = session.getUser({
        gateway_account_ids: [gatewayAccountId], permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should revoke and existing token', function (done) {
      publicauthMock.delete(PUBLIC_AUTH_PATH + '/' + gatewayAccountId, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000'
      }).reply(200, {'revoked': '15 Oct 2015'})

      request(app)
        .delete(paths.apiKeys.index + '?token_link=550e8400-e29b-41d4-a716-446655440000')
        .set('x-request-id', requestId)
        .send({csrfToken: csrf().create('123')})
        .expect(200, {'revoked': '15 Oct 2015'})
        .end(done)
    })

    it('should fail if no csrf', function (done) {
      publicauthMock.delete(PUBLIC_AUTH_PATH + '/' + gatewayAccountId, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000'
      }).reply(200, {'revoked': '15 Oct 2015'})

      request(app)
        .delete(paths.apiKeys.index + '?token_link=550e8400-e29b-41d4-a716-446655440000')
        .set('x-request-id', requestId)
        .set('Accept', 'application/json')
        .expect(400, {message: 'There is a problem with the payments platform'})
        .end(done)
    })

    it('should forward the error status code when revoking the token', function (done) {
      publicauthMock.delete(PUBLIC_AUTH_PATH + '/' + gatewayAccountId, {
        'token_link': '550e8400-e29b-41d4-a716-446655440000'
      }).reply(400, {})

      request(app)
        .delete(paths.apiKeys.index + '?token_link=550e8400-e29b-41d4-a716-446655440000')
        .set('x-request-id', requestId)
        .send({csrfToken: csrf().create('123')})
        .expect(400, {})
        .end(done)
    })

    it('should send 500 if any error happens while updating the resource', function (done) {
      // No serverMock defined on purpose to mock a network failure
      request(app)
        .delete(paths.apiKeys.index)
        .set('x-request-id', requestId)
        .send({
          token_link: '550e8400-e29b-41d4-a716-446655440000',
          csrfToken: csrf().create('123')

        })
        .expect(500, {})
        .end(done)
    })
  })

  describe('The /tokens/generate endpoint (create tokens and show generated token)', function () {
    var user
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens:create'
      user = session.getUser({
        gateway_account_ids: [gatewayAccountId], permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should create a token successfully', function (done) {
      publicauthMock.post(PUBLIC_AUTH_PATH, {
        'account_id': gatewayAccountId,
        'description': 'description',
        'created_by': user.email,
        'token_type': 'CARD'
      }).reply(200, {'token': TOKEN})
      connectorMock.get(CONNECTOR_PATH.replace('{accountId}', gatewayAccountId)).reply(200)
      buildFormPostRequest(paths.apiKeys.create, {'description': 'description'}, true)
        .expect(200)
        .expect(response => {
          expect(response.body.token).to.equal(TOKEN)
        })
        .end(done)
    })

    it('should only return the account_id', function (done) {
      connectorMock.get(CONNECTOR_PATH.replace('{accountId}', gatewayAccountId)).reply(200)

      buildGetRequest(paths.apiKeys.show)
        .expect(200)
        .expect(response => {
          expect(response.body.account_id).to.be.deep.equal(gatewayAccountId)
        })
        .end(done)
    })

    it('should fail if the account does not exist for a POST', function (done) {
      connectorMock.get(CONNECTOR_PATH.replace('{accountId}', gatewayAccountId)).reply(400)

      publicauthMock.post(PUBLIC_AUTH_PATH, {
        'account_id': gatewayAccountId,
        'description': 'description',
        'token_type': 'CARD'
      }).reply(200, {
        'token': TOKEN,
        navigation: true
      })

      buildFormPostRequest(paths.apiKeys.create, {})
        .expect(500, {
          'message': 'There is a problem with the payments platform'
        })
        .end(done)
    })

    it('should fail if the csrf does not exist for the post', function (done) {
      connectorMock.get(CONNECTOR_PATH.replace('{accountId}', gatewayAccountId)).reply(200)

      publicauthMock.post(PUBLIC_AUTH_PATH, {
        'account_id': gatewayAccountId,
        'description': 'description',
        'token_type': 'CARD'
      }).reply(200, {
        'token': TOKEN,
        navigation: true
      })

      buildFormPostRequest(paths.apiKeys.create, {}, true)
        .expect(500, {
          'message': 'There is a problem with the payments platform'
        })
        .end(done)
    })
  })
  describe('The /tokens/generate endpoint (create tokens and show generated token)', function () {
    var user
    let ddExternalId = 'DIRECT_DEBIT:asdjkjkasd'
    afterEach(function () {
      nock.cleanAll()
      app = null
    })

    beforeEach(function (done) {
      let permissions = 'tokens:create'
      user = session.getUser({
        gateway_account_ids: [ddExternalId], permissions: [{name: permissions}]
      })
      app = session.getAppWithLoggedInUser(getApp(), user)

      userCreator.mockUserResponse(user.toJson(), done)
    })

    it('should create a direct debit token successfully', function (done) {
      publicauthMock.post(PUBLIC_AUTH_PATH, {
        'account_id': ddExternalId,
        'description': 'description',
        'created_by': user.email,
        'token_type': 'DIRECT_DEBIT'
      }).reply(200, {'token': TOKEN})
      directDebitConnectorMock.get(CONNECTOR_PATH.replace('{accountId}', ddExternalId)).reply(200)
      buildFormPostRequest(paths.apiKeys.create, {'description': 'description'}, true)
        .expect(200)
        .expect(response => {
          expect(response.body.token).to.equal(TOKEN)
        })
        .end(done)
    })

    it('should return the external account_id', function (done) {
      directDebitConnectorMock.get(CONNECTOR_PATH.replace('{accountId}', ddExternalId)).reply(200)
      buildGetRequest(paths.apiKeys.show)
        .expect(200)
        .expect(response => {
          expect(response.body.account_id).to.be.deep.equal(ddExternalId)
        })
        .end(done)
    })
    it('should fail if the direct debit account does not exist for a POST', function (done) {
      directDebitConnectorMock.get(CONNECTOR_PATH.replace('{accountId}', ddExternalId)).reply(400)

      publicauthMock.post(PUBLIC_AUTH_PATH, {
        'account_id': ddExternalId,
        'description': 'description',
        'token_type': 'DIRECT_DEBIT'
      }).reply(200, {
        'token': TOKEN,
        navigation: true
      })

      buildFormPostRequest(paths.apiKeys.create, {})
        .expect(500, {
          'message': 'There is a problem with the payments platform'
        })
        .end(done)
    })
  })
})

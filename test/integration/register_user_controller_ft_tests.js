'use strict'

const path = require('path')
const nock = require('nock')
const supertest = require('supertest')
const paths = require(path.join(__dirname, '/../../app/paths.js'))
const getApp = require(path.join(__dirname, '/../../server.js')).getApp
const session = require(path.join(__dirname, '/../test_helpers/mock_session.js'))
const userFixtures = require(path.join(__dirname, '/../fixtures/user_fixtures'))
const csrf = require('csrf')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const adminusersMock = nock(process.env.ADMINUSERS_URL)
const INVITE_RESOURCE_PATH = '/v1/api/invites'
const expect = chai.expect

let app
let mockRegisterAccountCookie

describe('register user controller', function () {
  beforeEach((done) => {
    mockRegisterAccountCookie = {}
    app = session.getAppWithRegisterInvitesCookie(getApp(), mockRegisterAccountCookie)
    done()
  })

  afterEach((done) => {
    nock.cleanAll()
    app = null
    done()
  })

  /**
   *  ENDPOINT showRegistration
   */
  describe('show registration view endpoint', function () {
    it('should display create account form', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      supertest(app)
        .get(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).to.equal('invitee@example.com')
        })
        .end(done)
    })

    it('should display create account form with telephone populated, if invite has been attempted', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'
      mockRegisterAccountCookie.telephone_number = '123456789'

      supertest(app)
        .get(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).to.equal('invitee@example.com')
          expect(res.body.telephone_number).to.equal('123456789')
        })
        .end(done)
    })

    it('should display error when email and/or code is not in the cookie', function (done) {
      supertest(app)
        .get(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })
  })

  /**
   *  ENDPOINT submitRegistration
   */

  describe('submit registration details endpoint', function () {
    it('should error if cookie details are missing', function (done) {
      supertest(app)
        .post(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })

    it('should redirect back to registration form if error in phone number', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      const invalidPhone = '123456789'
      supertest(app)
        .post(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': invalidPhone,
          'password': 'password1234',
          csrfToken: csrf().create('123')
        })
        .expect(303, {})
        .expect('Location', paths.registerUser.registration)
        .expect((res) => {
          expect(mockRegisterAccountCookie.telephone_number).to.equal(invalidPhone)
        })
        .end(done)
    })

    it('should redirect to phone verification page', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/${mockRegisterAccountCookie.code}/otp/generate`)
        .reply(200)

      supertest(app)
        .post(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': '12345678901',
          'password': 'password1234',
          csrfToken: csrf().create('123')
        })
        .expect(303, {})
        .expect('Location', paths.registerUser.otpVerify)
        .end(done)
    })

    it('should error for valid registration data, if code not found', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/${mockRegisterAccountCookie.code}/otp/generate`)
        .reply(404)

      supertest(app)
        .post(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': '12345678901',
          'password': 'password1234',
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })
  })

  /**
   *  ENDPOINT showOtpVerify
   */
  describe('show otp verify endpoint', function () {
    it('should error if cookie details are missing', function (done) {
      supertest(app)
        .get(paths.registerUser.otpVerify)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })

    it('should display verify otp page successfully', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      supertest(app)
        .get(paths.registerUser.registration)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(200)
        .end(done)
    })
  })

  /**
   *  ENDPOINT submitOtpVerify
   */
  describe('validate otp code endpoint', function () {
    it('should validate otp code successfully', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'
      const newUserExtId = 'new-user-ext-id'
      const validUserResponse = userFixtures.validUserResponse({external_id: newUserExtId}).getPlain()

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/otp/validate`)
        .reply(201, validUserResponse)

      supertest(app)
        .post(paths.registerUser.otpVerify)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'verify-code': '123456',
          csrfToken: csrf().create('123')
        })
        .expect(303, {})
        .expect('Location', paths.registerUser.logUserIn)
        .expect(() => {
          expect(mockRegisterAccountCookie.userExternalId).to.equal(newUserExtId)
        })
        .end(done)
    })

    it('should error if cookie details are missing', function (done) {
      supertest(app)
        .post(paths.registerUser.otpVerify)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'verify-code': '123456',
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })

    it('should error and allow user to reenter otp if invalid otp code entry', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      supertest(app)
        .post(paths.registerUser.otpVerify)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'verify-code': 'hfwe67q', // non-numeric
          csrfToken: csrf().create('123')
        })
        .expect(303)
        .expect('Location', paths.registerUser.otpVerify)
        .end(done)
    })

    it('should error if error during otp code verification', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/otp/validate`)
        .reply(404)

      supertest(app)
        .post(paths.registerUser.otpVerify)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'verify-code': '123456',
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })
  })

  /**
   *  ENDPOINT showReVerifyPhone
   */
  describe('show re-verify phone endpoint', function () {
    it('should display re verify otp code form with pre-populated telephone number', function (done) {
      const telephoneNumber = '12345678901'

      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'
      mockRegisterAccountCookie.telephone_number = telephoneNumber

      supertest(app)
        .get(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(200)
        .expect((res) => {
          expect(res.body.telephone_number).to.equal(telephoneNumber)
        })
        .end(done)
    })

    it('should display error when email and/or code is not in the cookie', function (done) {
      supertest(app)
        .get(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })
  })

  /**
   *  ENDPOINT submitReVerifyPhone
   */
  describe('submit re-verify phone endpoint', function () {
    it('should proceed to verify otp upon successful telephone number re-entry', function (done) {
      const telephoneNumber = '12345678901'

      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/otp/resend`)
        .reply(200)

      supertest(app)
        .post(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': telephoneNumber,
          csrfToken: csrf().create('123')
        })
        .expect(303, {})
        .expect('Location', paths.registerUser.otpVerify)
        .end(done)
    })

    it('should error on an error during resend otp', function (done) {
      const telephoneNumber = '12345678901'

      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/otp/resend`)
        .reply(404)

      supertest(app)
        .post(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': telephoneNumber,
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })

    it('should redirect back to re verify phone view if error in phone number', function (done) {
      mockRegisterAccountCookie.email = 'invitee@example.com'
      mockRegisterAccountCookie.code = 'nfjkh438rf3901jqf'

      const invalidPhone = '123456789'

      supertest(app)
        .post(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': invalidPhone,
          csrfToken: csrf().create('123')
        })
        .expect(303, {})
        .expect('Location', paths.registerUser.reVerifyPhone)
        .expect((res) => {
          expect(mockRegisterAccountCookie.telephone_number).to.equal(invalidPhone)
        })
        .end(done)
    })

    it('should error if cookie details are missing', function (done) {
      const telephoneNumber = '12345678901'
      supertest(app)
        .post(paths.registerUser.reVerifyPhone)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-request-id', 'bob')
        .send({
          'telephone-number': telephoneNumber,
          csrfToken: csrf().create('123')
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })
  })

  /**
   * ENDPOINT subscribeService
   */
  describe('subscribe existing user to a service endpoint', () => {
    it('should redirect user to my-services page and display added to new service message', (done) => {
      const inviteCode = 'nfjkh438rf3901jqf'
      mockRegisterAccountCookie.code = inviteCode

      const serviceExternalId = '378y235y8234y5'
      adminusersMock.post(`${INVITE_RESOURCE_PATH}/${inviteCode}/complete`)
        .reply(200, {service_external_id: serviceExternalId})

      supertest(app)
        .get(paths.registerUser.subscribeService)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(303)
        .expect('Location', `${paths.serviceSwitcher.index}?s=${serviceExternalId}`)
        .end(done)
    })

    it('should error if cookie details are missing', function (done) {
      supertest(app)
        .get(paths.registerUser.subscribeService)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).to.equal('Unable to process registration at this time')
        })
        .end(done)
    })

    it('should error if invitation is expired', function (done) {
      const inviteCode = 'nfjkh438rf3901jqf'
      mockRegisterAccountCookie.code = inviteCode

      adminusersMock.post(`${INVITE_RESOURCE_PATH}/${inviteCode}/complete`)
        .reply(410, {})

      supertest(app)
        .get(paths.registerUser.subscribeService)
        .set('Accept', 'application/json')
        .set('x-request-id', 'bob')
        .expect(410)
        .expect((res) => {
          expect(res.body.message).to.equal('This invitation is no longer valid')
        })
        .end(done)
    })
  })
})

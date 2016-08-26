var should = require('chai').should();
var renderTemplate = require(__dirname + '/../test_helpers/html_assertions.js').render;
var paths = require(__dirname + '/../../app/paths.js');

var {TYPES}  = require(__dirname + '/../../app/controllers/payment_types_controller.js');

describe('The payment select type view', function () {
  it('should display the payment select type view', function () {

    var templateData = {
      allCardOption: {
        type: TYPES.ALL,
        selected: 'checked'
      },
      debitCardOption: {
        type: TYPES.DEBIT,
        selected: 'checked'
      }
    };

    var body = renderTemplate('payment_types_select_type', templateData);

    body.should.containSelector('h1.page-title').withExactText('Payment types');

    body.should.containSelector('input#payment-types-all-type')
      .withAttribute("name", "payment-types-card-type")
      .withAttribute("value", TYPES.ALL)
      .withAttribute("checked");

    body.should.containSelector('input#payment-types-debit-type')
      .withAttribute("name", "payment-types-card-type")
      .withAttribute("value", TYPES.DEBIT)
      .withAttribute("checked");

    body.should.containSelector('input#payment-types-continue-button')
      .withAttribute("name", "payment-types-continue-button")
      .withAttribute("class", "button")
      .withAttribute("type", "submit")
      .withAttribute("value", "Continue");
  });
});
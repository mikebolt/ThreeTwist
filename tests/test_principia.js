var test = require('unit.js');

describe('Logic', function() {
  context('always', function() {
    it('true is true', function() {
      test.should(true).equal(true);
      //test.assert.equal(true, true);
    });
    
    it('false is not true', function() {
      test.should(true).not.equal(false);
      //test.assert.notEqual(true, false);
    });
  });
});
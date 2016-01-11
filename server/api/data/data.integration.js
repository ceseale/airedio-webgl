'use strict';

var app = require('../..');
import request from 'supertest';

describe('Data API:', function() {

  describe('GET /api/data', function() {
    var datas;

    beforeEach(function(done) {
      request(app)
        .get('/api/data')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          datas = res.body;
          done();
        });
    });

    it('should respond with JSON array', function() {
      expect(datas).to.be.instanceOf(Array);
    });

  });

});

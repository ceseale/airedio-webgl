'use strict';

describe('Controller: MainController', function() {

  // load the controller's module
  beforeEach(module('fatalvisApp'));
  beforeEach(module('stateMock'));

  var scope;
  var MainController;
  var state;
  var $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(_$httpBackend_, $controller, $rootScope, $state) {
    $httpBackend = _$httpBackend_;
    $httpBackend.expectGET('api/data')
      .respond(Object);

    scope = $rootScope.$new();
    state = $state;
    MainController = $controller('MainController', {
      $scope: scope
    });
  }));

  xit('should attach a list of things to the controller', function() {
    $httpBackend.flush();
    expect(MainController.data).to.equal(400);
  });
});

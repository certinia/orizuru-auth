'use strict';

const
	proxyquire = require('proxyquire'),
	chai = require('chai'),

	expect = chai.expect,
	openidAuthMock = { name: 'openidAuthMock' },
	openidGrantMock = { name: 'openidGrantMock' },

	index = proxyquire('../src/index.js', {
		'./openid/auth': openidAuthMock,
		'./openid/grant': openidGrantMock
	});

describe('index.js', () => {

	it('should contain the correct parts', () => {
		expect(index.openid.auth).to.eql(openidAuthMock);
		expect(index.openid.grant).to.eql(openidGrantMock);
	});

});

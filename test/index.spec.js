'use strict';

const
	proxyquire = require('proxyquire'),
	chai = require('chai'),

	expect = chai.expect,
	openidMiddlewareMock = { name: 'openidMiddlewareMock' },
	openidGrantMock = { name: 'openidGrantMock' },

	index = proxyquire('../src/index.js', {
		'./openid/middleware': openidMiddlewareMock,
		'./openid/grant': openidGrantMock
	});

describe('index.js', () => {

	it('should contain the correct parts', () => {
		expect(index.openid.middleware).to.eql(openidMiddlewareMock);
		expect(index.openid.grant).to.eql(openidGrantMock);
	});

});

/*
 * Copyright (c) 2019, FinancialForce.com, inc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 *   are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following disclaimer in the documentation
 *      and/or other materials provided with the distribution.
 * - Neither the name of the FinancialForce.com, inc nor the names of its contributors
 *      may be used to endorse or promote products derived from this software without
 *      specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 *  OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @module client/openid/jwk
 */

import axios, { AxiosRequestConfig } from 'axios';
import { jsbn, pki, util } from 'node-forge';

/**
 * [JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
 */
export interface JsonWebKey {

	/**
	 * [Algorithm Parameter](https://tools.ietf.org/html/rfc7517#section-4.4)
	 *
	 * The algorithm parameter identifies the algorithm intended for use with the key.
	 */
	alg: string;

	/**
	 * Base64 URL encoded string representing the public exponent of the RSA Key.
	 */
	e: string;

	/**
	 * [Key ID Parameter](https://tools.ietf.org/html/rfc7517#section-4.5)
	 *
	 * The key ID parameter is used to match a specific key.
	 */
	kid: string;

	/**
	 * [Key Type Parameter](https://tools.ietf.org/html/rfc7517#section-4.1)
	 *
	 * The key type parameter identifies the cryptographic algorithm family used with the
	 * key, such as "RSA" or "EC".
	 */
	kty: string;

	/**
	 * Base64 URL encoded string representing the modulus of the RSA Key.
	 */
	n: string;

	/**
	 * [Public Key Use Parameter](https://tools.ietf.org/html/rfc7517#section-4.2)
	 */
	use: string;

}

/**
 * Map of JSON Web Keys, keyed by the Key ID Parameter.
 */
export interface JsonWebKeyMap {
	[index: string]: JsonWebKey;
}

/**
 * Map of JSON Web Keys, keyed by the Key ID Parameter, in PEM format.
 */
export interface JsonWebKeyPemFormatMap {
	[index: string]: string;
}

/**
 * Retrieves the JSON web keys and converts them to PEM format.
 */
export async function retrieveJsonWebKeysInPemFormat(jwksUri: string, config: AxiosRequestConfig) {

	const keyMap = await retrieveJsonWebKeys(jwksUri, config);

	return Object.entries(keyMap).reduce((result, [key, value]) => {
		result[key] = convertJwkToPem(value);
		return result;
	}, {} as JsonWebKeyPemFormatMap);

}

/**
 * Retrieves the JSON web keys.
 */
async function retrieveJsonWebKeys(jwksUri: string, config: AxiosRequestConfig) {

	const response = await axios.get(jwksUri, config);

	if (response.status !== 200) {
		throw new Error('Failed to retrieve JWKs');
	}

	const keys: JsonWebKey[] = response.data.keys;
	return keys.reduce((result, key) => {
		result[key.kid] = key;
		return result;
	}, {} as JsonWebKeyMap);

}

/**
 * Converts a JWK to PEM format.
 */
function convertJwkToPem(key: JsonWebKey) {

	const publicKey = pki.rsa.setPublicKey(
		base64urlToBigInteger(key.n),
		base64urlToBigInteger(key.e)
	);

	return pki.publicKeyToPem(publicKey).replace(/\r\n/g, '\n');

}

/**
 * Converts a base64 encoded string to a node forge big integer.
 * @param encodedStr The string to convert.
 */
function base64urlToBigInteger(encodedStr: string) {

	let decodeStr = encodedStr + '==='.slice((encodedStr.length + 3) % 4);
	decodeStr = decodeStr.replace(/\-/g, '+').replace(/_/g, '/');
	const bytes = util.decode64(decodeStr);
	const hexData = util.binary.hex.encode(bytes);

	// @ts-ignore-next-line
	return new jsbn.BigInteger(hexData, 16);

}

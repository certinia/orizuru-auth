/**
 * Copyright (c) 2018-2019, FinancialForce.com, inc
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
 * Salesforce JWT contained in the id_token field of the {@link AccessTokenResponse}.
 *
 * @see http://openid.net/specs/openid-connect-basic-1_0-28.html
 */
export interface SalesforceJwt {

	/**
	 * Access Token hash value.
	 *
	 * This is OPTIONAL when the ID Token is issued from the Token Endpoint, which is the case for this profile;
	 * nonetheless, an at_hash Claim MAY be present.Its value is the base64url encoding of the left - most half
	 * of the hash of the octets of the ASCII representation of the access_token value, where the hash algorithm
	 * used is the hash algorithm used in the alg parameter of the ID Token's JWS [JWS] header. For instance,
	 * if the alg is RS256, hash the access_token value with SHA-256, then take the left-most 128 bits and
	 * base64url encode them. The at_hash value is a case sensitive string.
	 */
	at_hash?: string;

	/**
	 * Audience(s) that this ID Token is intended for.
	 *
	 * It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value.
	 * It MAY also contain identifiers for other audiences.
	 * In the general case, the aud value is an array of case sensitive strings.
	 * In the special case when there is one audience, the aud value MAY be a single case sensitive string.
	 */
	aud: string;

	/**
	 * Expiration time on or after which the ID Token MUST NOT be accepted for processing.
	 *
	 * The processing of this parameter requires that the current date / time MUST be before the
	 * expiration date / time listed in the value.Implementers MAY provide for some small leeway,
	 * usually no more than a few minutes, to account for clock skew.The time is represented as
	 * the number of seconds from 1970 - 01 - 01T0: 0: 0Z as measured in UTC until the date / time.
	 * See RFC 3339[RFC3339] for details regarding date / times in general and UTC in particular.
	 * The exp value is a number.
	 */
	exp: number;

	/**
	 * Time at which the JWT was issued.
	 *
	 * The time is represented as the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until
	 * the date / time.The iat value is a number.
	 */
	iat: number;

	/**
	 * Issuer.
	 *
	 * Identifier for the Issuer of the response. The iss value is a case sensitive URL using the
	 * https scheme that contains scheme, host, and OPTIONALLY, port number and path components
	 * and no query or fragment components.
	 */
	iss: string;

	/**
	 * Subject identifier.
	 *
	 * A locally unique and never reassigned identifier within the Issuer for the End-User,
	 * which is intended to be consumed by the Client, e.g., 24400320 or
	 * AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4.It MUST NOT exceed 255 ASCII characters in length.
	 * The sub value is a case sensitive string.
	 */
	sub: string;

}

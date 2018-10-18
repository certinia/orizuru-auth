# @financialforcedev/orizuru-auth

## 5.0.0

- Update to be compatible with the latest version of Orizuru.
- Rename `Options.Auth` to `Environment` to handle the clashing `Options` namespace.
	- Everywhere we use `Options.Auth` we refer to the `env` property so `Environment` makes more sense.

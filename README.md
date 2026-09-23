# Point Ledger

[![Build, test, and deploy to Pages](https://github.com/systemslibrarian/crypto-lab-point-ledger/actions/workflows/deploy.yml/badge.svg)](https://github.com/systemslibrarian/crypto-lab-point-ledger/actions/workflows/deploy.yml)

An interactive lab for exploring secp256k1 quantum resource estimates, classical dialog multiplication, and the limits of Fiat-Shamir fuzz-test evidence.

## Live demo

https://systemslibrarian.github.io/crypto-lab-point-ledger/

## Run locally

```sh
npm ci
npm run dev
```

## Build and verify

```sh
npm test
npm run build
npm run test:a11y
```

Pushes to `main` deploy through GitHub Actions after the unit, production-build, and WCAG A/AA browser gates pass. Pull requests run the same gates without publishing. A deployment can also be started manually from the **Build, test, and deploy to Pages** workflow.
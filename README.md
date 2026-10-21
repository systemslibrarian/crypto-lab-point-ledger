# Point Ledger

[![Build, test, and deploy to Pages](https://github.com/systemslibrarian/crypto-lab-point-ledger/actions/workflows/deploy.yml/badge.svg)](https://github.com/systemslibrarian/crypto-lab-point-ledger/actions/workflows/deploy.yml)

An interactive lab for exploring secp256k1 quantum resource estimates, classical dialog multiplication, and the limits of Fiat-Shamir fuzz-test evidence.

## What It Is

A teaching demo, not production cryptography. Resource-estimate comparisons are cited calculations; the executable experiments use classical BigInt arithmetic, a dialog multiplication routine, and SHA-256/SHAKE-based test selection. The lab does not execute a quantum circuit, recover cryptocurrency keys, generate a zero-knowledge proof, or submit a benchmark result.

## When to Use It

Use it to compare resource-accounting assumptions, inspect multiplication and replay, and see why a finite fuzz-test sample cannot prove correctness on every input. Do not use this code to protect funds or treat a passing sample as a proof of quantum capability or cryptographic security.

## What Can Go Wrong

- Resource figures with different gate accounting, interfaces or correctness assumptions are not directly interchangeable.
- A fixed iteration or register-width budget can fail on some inputs even when a sampled batch passes.
- Repeatedly choosing test seeds changes what a passing selected sample establishes. Test-selection evidence is distinct from an independent correctness proof.

The page's scope and source locators are maintained in `src/sources.ts`; executable mechanisms live in `src/dialog.ts` and `src/fuzz.ts`.

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
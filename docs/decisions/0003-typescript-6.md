# 0003: Pin TypeScript 6.0, not 7

**Date:** 2026-11-04

## Decision

The web app uses TypeScript 6.0.x.

## Why

typescript-eslint, which `eslint-config-next` depends on, supports TypeScript below 6.1 only. TypeScript 7 would break linting.

## Revisit when

typescript-eslint supports TypeScript 7.

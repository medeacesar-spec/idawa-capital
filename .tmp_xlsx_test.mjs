import fs from 'fs';
import { register } from 'node:module';
// Compilation TS à la volée impossible sans loader : on transpile via tsc en mémoire.

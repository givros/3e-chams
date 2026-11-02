import test from 'node:test';
import assert from 'node:assert/strict';
import {scaledImageSize} from '../src/studio-images.js';
test('image sizing preserves proportions without enlarging small pictures',()=>{assert.deepEqual(scaledImageSize(4000,3000),{width:1280,height:960});assert.deepEqual(scaledImageSize(600,1200),{width:600,height:1200});assert.deepEqual(scaledImageSize(2000,4000),{width:640,height:1280});});
test('extreme proportions never create a zero-sized canvas',()=>{assert.deepEqual(scaledImageSize(1,100000),{width:1,height:1280});});

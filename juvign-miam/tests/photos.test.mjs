import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {photoBank,photoCategories} from '../src/studio-photos.js';

test('photo themes include food and six alternatives with real bundled JPEG assets',async()=>{
 assert.equal(new Set(photoBank.map(photo=>photo.id)).size,photoBank.length);
 for(const [category]of photoCategories.filter(([id])=>id!=='all'))assert.ok(photoBank.filter(photo=>photo.category===category).length>=3,category);
 for(const photo of photoBank){assert.match(photo.src,/^assets\/[a-z-]+\.jpg$/);const bytes=await readFile(new URL('../'+photo.src,import.meta.url));assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length>1000);assert.ok(bytes.length<400000);}
});

test('existing food paths are retained for saved applications and added photos retain source references',()=>{
 for(const id of ['burger','pizza','sushi','tacos','fries','drink'])assert.ok(photoBank.some(photo=>photo.id===id&&photo.src===`assets/${id}.jpg`));
 assert.ok(photoBank.filter(photo=>photo.category!=='food').every(photo=>photo.source.startsWith('https://images.unsplash.com/photo-')));
});

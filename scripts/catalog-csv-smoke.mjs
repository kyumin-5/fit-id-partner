import assert from 'node:assert/strict';
import {parseCatalogCSV,tokenizeCSV,EXAMPLE_CSV} from '../app/lib/catalogCsvImport.ts';

const rows=tokenizeCSV('ID,상품명\r\n1,"테스트, 두 단어"\r\n2,"여러\n줄"\r\n');
assert.equal(rows.length,3);
assert.equal(rows[1][1],'테스트, 두 단어');
assert.equal(rows[2][1],'여러\n줄');

const example=parseCatalogCSV(EXAMPLE_CSV);
assert.equal(example.issues.filter(i=>i.severity==='error').length,0,JSON.stringify(example.issues));
assert.equal(example.products.length,3);
assert.equal(example.readyCount,2);
assert.equal(example.draftCount,1);
assert.equal(example.products[0].merchant_product_id,'A-001');
assert.deepEqual(example.products[0].sizes.map(x=>x.label),['S','M']);
assert.equal(example.products[0].sizes[0].measurements.CHEST_WIDTH,54);
assert.equal(example.products[1].major_category,'BOTTOM');
assert.equal(example.products[2].sizes.length,0);

const repeated=parseCatalogCSV('상품번호,상품명,사이즈\nZ1,후드 맨투맨,M\nZ1,후드 맨투맨,L\n');
assert.equal(repeated.products.length,1);
assert.equal(repeated.products[0].sizes.length,0);
assert.equal(repeated.draftCount,1);

const invalid=parseCatalogCSV('상품번호,상품명,사이즈,허리단면,힙단면\nZ1,테스트 슬랙스,M,-10,50\n');
assert.ok(invalid.issues.some(i=>i.severity==='error'));
const noId=parseCatalogCSV('상품명\n티셔츠\n');
assert.ok(noId.issues.some(i=>i.severity==='error'));
console.log('PASS catalog parser: quoting, example grouping, READY/DRAFT, missing size, invalid measurements, missing headers');

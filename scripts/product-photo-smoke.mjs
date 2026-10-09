import assert from 'node:assert/strict';
import {inspectProductImage,publicPartnerImageUrl,uploadPartnerProductImage} from '../app/lib/productImage.ts';

const validJpeg=new File([new Uint8Array([255,216,255,224,0,1,2,3])],'photo.jpg',{type:'image/jpeg'});
const magic=await inspectProductImage(validJpeg);
assert.deepEqual(magic,{mime:'image/jpeg',ext:'jpg'});
await assert.rejects(()=>inspectProductImage(new File(['not a real image'],'fake.png',{type:'image/png'})),/지원하지 않는 이미지/);
await assert.rejects(()=>inspectProductImage(new File([new Uint8Array([255,216,255,224])],'fake.png',{type:'image/png'})),/파일 형식과 이미지 내용/);
await assert.rejects(()=>inspectProductImage(new File([''],'empty.jpg',{type:'image/jpeg'})),/5MB/);

const uid='11111111-1111-4111-8111-111111111111';
const shopId='22222222-2222-4222-8222-222222222222';
const pid='33333333-3333-4333-8333-333333333333';
let lastUpload='';
let lastRemoved='';
let failDb=false;
let fileUploadOptions;
const fake={
  auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},
  storage:{from:(bucket)=>{
    assert.equal(bucket,'product-images');
    return {
      upload:async(path,file,opts)=>{
        lastUpload=path;fileUploadOptions=opts;
        assert.equal(file,validJpeg);return {error:null};
      },
      remove:async(paths)=>{lastRemoved=paths[0];return {error:null}},
      getPublicUrl:path=>({data:{publicUrl:'https://example.invalid/storage/'+path}})
    }
  }},
  from:(table)=>{
    assert.equal(table,'products');
    let currentPath='';
    const o={
      select:()=>o,eq:()=>o,maybeSingle:async()=>({data:{id:pid,shop_id:shopId},error:null}),
      update:(v)=>{currentPath=v.image_path;return o},
      single:async()=>failDb?{data:null,error:{message:'denied'}}:{data:{image_path:currentPath},error:null}
    };return o;
  }
};
const r=await uploadPartnerProductImage({
  db:fake,shopId,authUserId:uid,productId:pid,file:validJpeg
});
assert.equal(r.imagePath,lastUpload);
assert.match(r.imagePath,/^11111111-1111-4111-8111-111111111111\/22222222-2222-4222-8222-222222222222\/33333333-3333-4333-8333-333333333333\/[a-z0-9-]+\.jpg$/);
assert.equal(fileUploadOptions.upsert,false);
assert.equal(fileUploadOptions.contentType,'image/jpeg');
assert.equal(r.url,publicPartnerImageUrl(fake,r.imagePath));
failDb=true;
await assert.rejects(()=>uploadPartnerProductImage({
  db:fake,shopId,authUserId:uid,productId:pid,file:validJpeg
}),/사진을 연결하지 못했습니다/);
assert.equal(lastRemoved,lastUpload,'DB failure cleans unlinked uploaded object');
await assert.rejects(()=>uploadPartnerProductImage({
  db:fake,shopId,authUserId:'wrong',productId:pid,file:validJpeg
}),/권한/);
console.log('PASS photo upload: type signatures, file magic, owner identity, storage paths, public URL, DB rollback.');

import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,renderHook} from '@testing-library/react';
import {Image,type ImageSourcePropType} from 'react-native';
import {PHOTO_FRAME_DEFAULT_RATIO,usePhotoFrameRatio} from './composition-controls';
afterEach(()=>{cleanup();vi.restoreAllMocks();});

/** getSize가 부르면 바로 답하지 않고, 시험이 sizes에 넣은 크기로 답하게 한다 */
function fakeGetSize() {
  const calls:{uri:string;ok:(w:number,h:number)=>void}[]=[];
  vi.spyOn(Image,'getSize').mockImplementation(((uri:string,ok:(w:number,h:number)=>void)=>{calls.push({uri,ok});}) as never);
  return calls;
}
const ratioOf=(source:ImageSourcePropType)=>renderHook(({s}:{s:ImageSourcePropType})=>usePhotoFrameRatio(s),{initialProps:{s:source}});

describe('usePhotoFrameRatio', ()=>{
  it('크기를 알기 전에는 기본 틀, 크기를 알면 사진 비율', async ()=>{
    const calls=fakeGetSize();
    const {result}=ratioOf({uri:'file:///a.jpg'});
    expect(result.current).toBeCloseTo(PHOTO_FRAME_DEFAULT_RATIO);
    expect(calls[0].uri).toBe('file:///a.jpg');
    await vi.waitFor(()=>{calls[0].ok(4032,3024);expect(result.current).toBeCloseTo(4/3);});
  });
  it('아주 긴 세로 사진은 3:4, 아주 넓은 가로 사진은 16:9', async ()=>{
    const calls=fakeGetSize();
    const tall=ratioOf({uri:'file:///tall.jpg'});
    const wide=ratioOf({uri:'file:///wide.jpg'});
    await vi.waitFor(()=>{calls[0].ok(1080,2400);calls[1].ok(3000,1000);expect(tall.result.current).toBeCloseTo(3/4);expect(wide.result.current).toBeCloseTo(16/9);});
  });
  it('사진이 바뀌면 새 크기를 알 때까지 기본 틀로 돌아간다', async ()=>{
    const calls=fakeGetSize();
    const {result,rerender}=ratioOf({uri:'file:///a.jpg'});
    await vi.waitFor(()=>{calls[0].ok(3000,4000);expect(result.current).toBeCloseTo(3/4);});
    rerender({s:{uri:'file:///b.jpg'}});
    expect(result.current).toBeCloseTo(PHOTO_FRAME_DEFAULT_RATIO);
    calls[0].ok(3000,4000); // 지난 사진의 늦은 답은 무시
    expect(result.current).toBeCloseTo(PHOTO_FRAME_DEFAULT_RATIO);
  });
  it('크기를 못 읽으면 기본 틀 그대로', ()=>{
    vi.spyOn(Image,'getSize').mockImplementation(((_u:string,_ok:unknown,fail:(e:unknown)=>void)=>fail(new Error('x'))) as never);
    const {result}=ratioOf({uri:'file:///gone.jpg'});
    expect(result.current).toBeCloseTo(PHOTO_FRAME_DEFAULT_RATIO);
  });
});

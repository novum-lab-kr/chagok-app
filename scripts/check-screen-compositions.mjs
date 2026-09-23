// Usage: node scripts/check-screen-compositions.mjs [path-to-playwright/index.mjs]
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.argv[2]||'playwright');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];let current='';
page.on('pageerror',error=>errors.push({story:current,error:error.message}));
page.on('console',message=>{if(message.type()==='error')errors.push({story:current,error:message.text()})});
const out='docs/design/retro-pocket-v1/review-set-02/implementation-review';fs.mkdirSync(out,{recursive:true});
async function open(story){current=story;await page.goto(`http://127.0.0.1:6006/iframe.html?id=screens-review-set-02--${story}&viewMode=story`);await page.waitForFunction(()=>document.querySelector('#storybook-root')?.textContent?.trim().length>0);await page.evaluate(()=>document.fonts.ready);if(story.startsWith('tutorial'))await page.getByRole('dialog').waitFor();else await page.getByRole('button').first().waitFor();}
try {
  await open('new-goal');
  assert.equal(await page.getByRole('button',{name:'만들기',exact:true}).getAttribute('aria-disabled'),'true');
  await page.getByRole('textbox',{name:'목표 이름',exact:true}).fill('매일 운동');
  await page.getByRole('button',{name:'직접 입력',exact:true}).click();
  await page.getByRole('textbox',{name:'칸 수 직접 입력'}).fill('18');
  await page.getByRole('button',{name:'바꾸기',exact:true}).click();
  await page.getByRole('tab',{name:'사물',exact:true}).click();
  await page.getByRole('radio',{name:'운동화',exact:true}).click();
  await page.getByRole('button',{name:'선택 완료',exact:true}).click();
  await page.getByRole('button',{name:'만들기',exact:true}).click();
  await page.getByRole('button',{name:'매일 운동, 0 / 18',exact:true}).waitFor();
  await page.getByRole('button',{name:'1번 칸, 붙일 수 있음',exact:true}).click();
  await page.getByRole('button',{name:'1번 칸, 운동화 스티커',exact:true}).waitFor();

  await open('goal-settings');
  await page.getByRole('textbox',{name:'목표 이름',exact:true}).fill('매일 독서');
  await page.getByRole('tab',{name:'모양',exact:true}).click();
  await page.getByRole('radio',{name:'별',exact:true}).click();
  await page.getByRole('button',{name:'저장하기',exact:true}).click();
  await page.getByRole('button',{name:'매일 독서, 6 / 15',exact:true}).waitFor();
  await page.getByRole('button',{name:'1번 칸, 별 스티커',exact:true}).waitFor();

  await open('calendar-home');
  await page.getByRole('button',{name:'9월 21일',exact:true}).click();
  await page.getByRole('button',{name:'9월 21일, 기록 있음',exact:true}).waitFor();
  await page.getByRole('button',{name:'이전 달',exact:true}).click();
  await page.getByText('2026년 8월',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/^8월 \d+일/}).count(),31);
  await page.getByRole('button',{name:'다음 달',exact:true}).click();
  await page.getByRole('button',{name:'9월 21일, 기록 있음',exact:true}).click();
  await page.getByRole('button',{name:'저장',exact:true}).waitFor();

  await open('tally-home');
  await page.getByRole('button',{name:'7번 칸, 붙일 수 있음',exact:true}).click();
  await page.getByRole('button',{name:'7번 칸, 새싹이 스티커',exact:true}).click();
  await page.getByRole('button',{name:'사진 지우기',exact:true}).click();
  await page.getByText('사진을 남겨보세요',{exact:true}).waitFor();
  const chooserPromise=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'사진 추가',exact:true}).click();
  await (await chooserPromise).setFiles('assets/icon.png');
  await page.getByRole('img',{name:'기록 사진',exact:true}).waitFor();
  await page.getByRole('textbox',{name:'메모',exact:true}).fill('오늘도 한 장을 읽었다.');
  await page.getByRole('button',{name:'저장',exact:true}).click();
  await page.getByRole('button',{name:'7번 칸, 새싹이 스티커',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'오늘도 한 장을 읽었다.');
  await page.getByRole('button',{name:'스티커 떼기',exact:true}).click();
  await page.getByRole('button',{name:'7번 칸, 붙일 수 있음',exact:true}).waitFor();

  await open('tutorial-goal');
  for(const title of ['목표 만들기','스티커 고르기']){
    const dialog=page.getByRole('dialog',{name:title,exact:true});await dialog.waitFor();
    await page.keyboard.press('Tab');await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
    await page.getByRole('button',{name:'다음',exact:true}).click();
  }
  await page.getByRole('dialog',{name:'빈칸에 톡!',exact:true}).waitFor();
  await page.getByRole('button',{name:'시작하기',exact:true}).click();
  await page.getByText('튜토리얼을 마쳤어요',{exact:true}).waitFor();
  await open('tutorial-sticker');await page.keyboard.press('Escape');
  await page.getByText('튜토리얼을 마쳤어요',{exact:true}).waitFor();

  const captures=[],images=[];
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const [story,file] of [['tally-home','01-home-tally'],['calendar-home','02-home-calendar'],['new-goal','03-new-goal'],['goal-settings','04-goal-settings'],['sticker-record','05-sticker-record'],['tutorial-goal','06-tutorial-goal'],['tutorial-sticker','07-tutorial-sticker'],['tutorial-place','08-tutorial-place']]){
      await open(story);await page.waitForTimeout(120);
      const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight}));
      assert.ok(dimensions.scrollWidth<=dimensions.viewport,`${story} overflows at ${width}`);
      const fileName=`${file}${width===390?'':'-320'}.png`;
      images.push({fileName,buffer:await page.screenshot({fullPage:true})});captures.push({story,width,...dimensions});
    }
  }
  assert.deepEqual(errors,[]);
  // Write artifacts after navigation finishes so Vite does not reload during capture.
  for(const {fileName,buffer} of images)fs.writeFileSync(`${out}/${fileName}`,buffer);
  fs.writeFileSync(`${out}/verification.json`,JSON.stringify({checks:['create goal and custom count','select and persist sticker','change month and date record','place/remove sticker','upload/delete photo','save memo','tutorial next/finish/Escape and keyboard containment'],captures,errors},null,2));
  console.log('8 screens at 390/320px; full demo flows passed; no browser errors.');
} finally {fs.writeFileSync(`${out}/render-errors.json`,JSON.stringify(errors,null,2));await browser.close();}

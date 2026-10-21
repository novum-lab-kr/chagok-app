import base64, json, sys, html, re
S = sys.argv[1]
img = lambda n: 'data:image/png;base64,' + base64.b64encode(open(f'{S}/cap/{n}.png','rb').read()).decode()
e=html.escape
opts = [
 dict(id='a', name='a 시작 화면 위 시트', rec=True,
  shots=[('n-1','로그인한 뒤 처음 계정이면')],
  desc='로그인이 끝나면 시작 화면 위로 「처음 오셨네요」 시트를 올려요. 체크 두 개와 처리방침 보기, [동의하고 시작하기]만 있어요. 메모 반영: 시트 안 여백을 앱 다이얼로그와 같은 20으로 넓히고(위는 24), 줄 사이도 12에서 16으로 벌렸어요. 「만 14세 미만이에요」 링크는 뺐어요.',
  good=['방금 누른 화면 위에 바로 떠서 한 단계처럼 느껴져요.','국내 앱에서 흔한 모양이라 낯설지 않아요.'],
  bad=['시트를 내려서 닫으면 동의하지 않은 것으로 보고 계정을 지워요. 이 처리를 꼭 만들어야 해요.']),
 dict(id='b', name='b 전체 화면', rec=False,
  shots=[('n-2','로그인한 뒤 처음 계정이면')],
  desc='무신사처럼 동의 화면 한 장으로 넘어가요. 지금 동의 화면 틀(뒤로 버튼과 제목)을 그대로 쓰고, 로그인 버튼 자리에 [동의하고 시작하기]를 둬요.',
  good=['지금 있는 화면 틀을 그대로 써서 만들기 쉬워요.','항목이 늘어도 자리가 넉넉해요.'],
  bad=['화면 아래쪽 절반이 비어 있어요.','다른 화면으로 넘어가서 단계가 하나 늘어난 느낌이 있어요.']),
 dict(id='c', name='c 전체 화면에 「모두 동의」 줄', rec=False,
  shots=[('n-3','로그인한 뒤 처음 계정이면')],
  desc='b에 무신사처럼 「모두 동의해요」 줄을 더해요. 누르면 아래 체크가 한 번에 켜져요.',
  good=['국내 쇼핑 앱에서 가장 익숙한 모양이에요.','나중에 선택 항목(알림 동의 같은 것)이 생기면 쓸모가 커져요.'],
  bad=['지금은 필수 두 개뿐이라 「모두 동의」로 줄어드는 건 한 번뿐이에요.']),
]
parts=[]
for o in opts:
  shots=''.join(f'<figure><img src="{img(n)}" alt="{e(c)}"><figcaption>{e(c)}</figcaption></figure>' for n,c in o['shots'])
  good=''.join(f'<li>{e(x)}</li>' for x in o['good']); bad=''.join(f'<li>{e(x)}</li>' for x in o['bad'])
  rec='<span class="tag rec">추천</span>' if o['rec'] else ''
  parts.append(f'''<section class="opt" id="opt-{o['id']}">
  <div class="head"><h2>{e(o['name'])}</h2>{rec}</div>
  <div class="shots">{shots}</div>
  <p>{e(o['desc'])}</p>
  <div class="pc"><div><h3>좋은 점</h3><ul>{good}</ul></div><div><h3>걸리는 점</h3><ul>{bad}</ul></div></div>
  <label for="note-{o['id']}" class="status">메모</label>
  <textarea id="note-{o['id']}" placeholder="이 안에 대한 메모"></textarea>
  <button type="button" class="pick" id="pick-{o['id']}">이 안 고르기</button>
</section>''')
t=open(f'{S}/consent.template.html').read()
head='''<header style="display:flex;flex-direction:column;gap:10px">
    <h1>로그인 먼저, 새 계정만 동의</h1>
    <p>클래스101, 무신사, NOL처럼 시작 화면에는 로그인 버튼만 두고, 약관 동의는 로그인한 뒤 <b>처음 가입하는 사람에게만</b> 받는 흐름이에요. SNS 로그인이라고 약관을 건너뛰는 건 아니에요. 무신사도 로그인 뒤에 「통합계정 이용 동의」 화면을 따로 보여 줘요. 고를 것은 그 동의 화면의 모양이에요. 캡처는 앱의 실제 컴포넌트로 그렸어요.</p>
  </header>

  <section class="opt">
    <div class="head"><h2>시작 화면과 흐름</h2><span class="tag">공통</span></div>
    <div class="shots"><figure><img src="__N0A__" alt="시작 화면 지금"><figcaption>지금 (Apple 하나)</figcaption></figure><figure><img src="__N0B__" alt="시작 화면 셋"><figcaption>나중 (카카오, Apple, Google)</figcaption></figure></div>
    <ol class="flow">
      <li>시작 화면에는 체크가 없어요. 로그인 버튼과 [로그인 없이 시작하기]만 있어요.</li>
      <li>로그인했는데 <b>이미 동의한 계정</b>이면 바로 시작해요. 로그아웃 뒤 다시 로그인해도 체크를 다시 받지 않아요.</li>
      <li><b>처음 만든 계정</b>이면 동의 화면이 떠요. [동의하고 시작하기]를 누르면 동의를 기록하고 시작해요.</li>
      <li>동의하지 않고 닫으면 「가입을 그만할까요? 방금 만든 계정은 지워져요」를 묻고, 계정을 지운 뒤 시작 화면으로 돌아가요.</li>
      <li>만 14세 미만은 「만 14세 이상이에요」에 체크할 수 없으니 동의 화면을 닫게 돼요. 그러면 4번처럼 계정을 지우고, [로그인 없이 시작하기]로 쓸 수 있어요. 따로 누르는 「만 14세 미만이에요」 링크는 두지 않아요(2026-10-21).</li>
      <li>설정에서 계정을 연결할 때도 같은 순서예요.</li>
    </ol>
  </section>

  <section class="box">
    <h2>먼저 확인한 규정</h2>
    <table class="rules">
      <tr><th>Apple 심사 5.1.1(v)</th><td>앱을 쓰는 데 개인정보 입력을 요구하면 안 되지만, 법이 요구하는 것은 예외예요. 동의 화면은 개인정보를 더 받지 않고 체크만 받아요.</td></tr>
      <tr><th>Apple HIG</th><td>로그인 뒤에 더 받는 것이 있으면 필수인지 밝히라고 해요. 그래서 [필수]를 붙여요. Airbnb도 Apple 로그인 뒤에 「동의하고 계속하기」 화면을 보여 줘요.</td></tr>
      <tr><th>Apple 심사 4.8</th><td>Apple 로그인은 이름과 이메일만 받아야 해요. 동의 화면에서 이름이나 전화번호를 다시 묻지 않아요.</td></tr>
      <tr><th>약관규제법 3조</th><td>계약할 때 약관을 분명히 밝혀야 해요. 이용약관 줄의 [&gt;]로 전문을 열어요.</td></tr>
      <tr><th>개인정보 보호법 15조</th><td>계약을 맺는 데 필요한 정보는 동의 없이 처리할 수 있어요(1항 4호). 그래서 처리방침은 체크 없이 [&gt;]로 안내만 해요.</td></tr>
      <tr><th>개인정보 보호법 22조의2</th><td>만 14세 미만의 정보를 <b>동의를 받아 처리할 때</b> 보호자 동의가 필요해요. 이 흐름에서는 나이를 묻기 전에 계정이 먼저 만들어져요. 14세 이상에 체크하지 않고 닫으면 바로 지우지만, 그 사이 잠깐 서버에 계정이 있었던 것이 괜찮은지는 법 검토 목록(LEGAL-REVIEW)에 넣어 확인할게요. 처음부터 [로그인 없이 시작하기]를 누르는 아이는 서버에 아무것도 닿지 않아요.</td></tr>
      <tr><th>카카오싱크</th><td>나중에 카카오를 붙이면 카카오 로그인 창 안에서 약관 동의를 같이 받을 수 있어요(카카오 공식 문서). 그러면 카카오 사용자는 이 동의 화면을 건너뛰어요.</td></tr>
    </table>
    <p class="status">출처(원문 확인): App Store Review Guidelines 4.8, 5.1.1(v), HIG Sign in with Apple, 약관의 규제에 관한 법률 제3조, 개인정보 보호법 제15조와 제22조의2(법제처, 2026-09-11 시행본), 카카오싱크 이해하기(developers.kakao.com/docs/ko/kakaosync/common). 다른 서비스는 웹 로그인 화면을 직접 열어 봤어요. SNS 로그인을 누른 뒤의 화면은 보내 주신 무신사 캡처와 Airbnb 흐름 기록(lazyweb.com)으로만 봤어요.</p>
  </section>

  <section class="box">
    <h2>지난 시안(2안 체크 방식)과 다른 점</h2>
    <ul>
      <li><b>좋아지는 점:</b> 시작 화면이 가장 깔끔해요. 다시 로그인하는 사람은 체크를 다시 보지 않아요. 체크 없이 로그인 버튼을 누르는 경우가 아예 없어서, 버튼 비활성 문제도 사라져요.</li>
      <li><b>새로 생기는 일:</b> 동의하지 않고 닫으면 방금 만든 계정을 지워야 해요. 이미 있는 계정 삭제 기능을 써요.</li>
    </ul>
  </section>'''
t=re.sub(r'<header.*?</section>\s*<!--OPTIONS-->', lambda m: head+'\n\n  <!--OPTIONS-->', t, flags=re.S)
t=t.replace('__N0A__',img('n-0-a')).replace('__N0B__',img('n-0-b')).replace('<!--OPTIONS-->','\n'.join(parts)).replace('__OPTS__',json.dumps([{'id':o['id'],'name':o['name']} for o in opts],ensure_ascii=False))
t=t.replace('.status{','.rules{border-collapse:collapse;width:100%;font-size:15px}.rules th{font-family:var(--display);font-weight:400;text-align:left;vertical-align:top;padding:8px 10px 8px 0;white-space:nowrap}.rules td{padding:8px 0;vertical-align:top}.rules tr+tr{border-top:2px solid var(--line)}@media (max-width:600px){.rules th,.rules td{display:block;white-space:normal;padding:4px 0}.rules th{padding-top:10px}}\n.status{',1)
t=t.replace('<title>가입과 로그인 줄이기</title>','<title>로그인 먼저 새 계정 동의</title>').replace('review/choice-signup','review/choice-afterlogin').replace('review/note-signup-','review/note-afterlogin-').replace("'가입과 로그인 줄이기 시안'","'로그인 먼저 새 계정 동의 시안'")
open(f'{S}/login-buttons.html','w').write(t)
print(len(t), '·' in t, t.count('afterlogin'), '__' in t.replace('__OPTS__',''))

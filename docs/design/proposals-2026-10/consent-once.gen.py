import base64, json, sys, html
S = sys.argv[1]
img = lambda n: 'data:image/png;base64,' + base64.b64encode(open(f'{S}/cap/{n}.png','rb').read()).decode()
opts = [
 dict(id='a', name='A 시작 화면에서 바로 로그인', rec=True, like='Notion, Duolingo, Day One 같은 해외 앱에서 흔한 방식',
  shots=[('a-1','시작 화면: 로그인 버튼과 안내 한 줄, 아래에 "로그인 없이 시작하기"'),('a-2','설정에서 연결할 때도 같은 묶음')],
  flow=['시작 화면에서 Apple 버튼을 누르고 Apple 창에서 확인하면 끝이에요.','버튼 바로 아래 안내 한 줄("로그인하면 만 14세 이상이고 이용약관에 동의한 것으로 봐요")로 동의를 받아요. 약관과 처리방침은 밑줄을 눌러 볼 수 있어요.','처음 가입이든 다시 로그인이든 똑같아요. 서버에는 처음 가입할 때 한 번만 동의 기록을 남겨요.','"로그인 없이 시작하기"는 바로 튜토리얼로 가요. "만 14세 미만이에요"는 안내 뒤 이 기기 모드로 바로 시작해요.'],
  good=['누르는 횟수가 가장 적어요. 처음 가입도, 다시 로그인도 버튼 하나예요.','시작 화면과 동의 화면 두 장이 한 장으로 줄어요. "계속" 버튼과 체크가 없어져요.','로그인 전에 나이를 말하게 하는 지금 원칙을 지켜요. 14세 미만 정보가 서버에 닿지 않아요.'],
  bad=['체크 없이 "누르면 동의"로 받아요. 이용약관과 만 14세 확인이 이 방식으로 충분한지 법 검토가 필요해요(LEGAL-REVIEW에 넣을게요).','안내 글씨가 작으면 다크패턴이라는 비판을 받을 수 있어서, 글씨 크기와 밑줄을 분명히 둬야 해요.']),
 dict(id='b', name='B 로그인 먼저, 새 계정만 동의 시트', rec=False, like='카카오싱크 간편가입과 국내 앱에서 흔한 방식',
  shots=[('b-1','시작 화면: A와 같지만 안내 한 줄이 없어요'),('b-2','처음 가입한 계정만: 아래에서 올라오는 동의 시트')],
  flow=['시작 화면에서 바로 로그인해요.','서버에 동의 기록이 있으면(다시 로그인) 그대로 들어가요.','없으면(처음 가입) 시트가 올라와 만 14세와 이용약관을 체크받아요. [동의하고 시작하기]로 들어가요.','시트를 닫으면 방금 만든 계정을 지우고 시작 화면에 남아요.'],
  good=['다시 로그인은 버튼 하나예요.','동의를 체크로 분명히 받아서 법적으로 가장 무난해요.','처음 가입하는 사람만 한 단계를 더 거쳐요.'],
  bad=['나이를 로그인 뒤에 물어요. 14세 미만이 로그인하면 Apple 정보가 잠깐 서버에 닿았다가 지워져요. "14세 미만 정보는 서버에 보내지 않는다"는 지금 원칙을 바꿔야 해요.','시트에서 14세 미만이라고 하면 계정을 지우는 처리가 하나 더 생겨요.']),
 dict(id='c', name='C 먼저 써 보고 나중에 연결', rec=False, like='Duolingo, Daylio 같은 기록 앱에서 흔한 방식',
  shots=[('c-1','시작 화면 없이 튜토리얼 뒤 홈. 맨 위에 계정 안내 카드'),('a-2','카드나 설정에서 누르면 A와 같은 연결 화면')],
  flow=['앱을 처음 열면 시작 화면 없이 바로 튜토리얼로 가요.','홈 맨 위에 "쓰던 기록이 있나요?" 카드가 보여요. 닫거나 목표를 만들면 사라져요.','계정 연결은 카드나 설정에서 해요. 연결 화면은 A와 같아요(안내 한 줄로 동의).'],
  good=['처음 여는 사람은 아무것도 고르지 않고 바로 써 봐요.','Duolingo는 가입을 뒤로 미뤘더니 매일 쓰는 사람이 약 20% 늘었다고 알려져 있어요.'],
  bad=['기기를 바꾼 사람은 카드를 지나치면 설정까지 찾아가야 해요.','백업을 늦게 켜는 사람이 많아져서, 폰을 잃어버리면 기록을 잃을 수 있어요.','시작 화면을 없애니 흐름도와 튜토리얼 조건을 함께 고쳐야 해요.']),
]
parts=[]
e=html.escape
for o in opts:
  shots=''.join(f'<figure><img src="{img(n)}" alt="{e(c)}"><figcaption>{e(c)}</figcaption></figure>' for n,c in o['shots'])
  flow=''.join(f'<li>{e(x)}</li>' for x in o['flow'])
  good=''.join(f'<li>{e(x)}</li>' for x in o['good']); bad=''.join(f'<li>{e(x)}</li>' for x in o['bad'])
  rec='<span class="tag rec">추천</span>' if o['rec'] else ''
  parts.append(f'''<section class="opt" id="opt-{o['id']}">
  <div class="head"><h2>{e(o['name'])}</h2>{rec}<span class="tag">{e(o['like'])}</span></div>
  <div class="shots">{shots}</div>
  <div class="flow"><ol>{flow}</ol></div>
  <div class="pc"><div><h3>좋은 점</h3><ul>{good}</ul></div><div><h3>걸리는 점</h3><ul>{bad}</ul></div></div>
  <label for="note-{o['id']}" class="status">메모</label>
  <textarea id="note-{o['id']}" placeholder="이 안에 대한 메모"></textarea>
  <button type="button" class="pick" id="pick-{o['id']}">이 안 고르기</button>
</section>''')
t=open(f'{S}/consent.template.html').read()
t=t.replace('__NOW1__',img('now-1')).replace('__NOW2__',img('now-2')).replace('<!--OPTIONS-->','\n'.join(parts)).replace('__OPTS__',json.dumps([{'id':o['id'],'name':o['name']} for o in opts],ensure_ascii=False))
open(f'{S}/consent.html','w').write(t)
print(len(t), '·' in t)

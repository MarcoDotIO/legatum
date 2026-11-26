import json,sys
v=json.load(open('view.json')); s=json.load(open('view.json.state.json'))
T=['Ocean','Coast','Grassland','Plains','Forest','Hills','Desert','Tundra','Mountains']
m=s['map']; W,H=m['width'],m['height']
def off(p): q,r=p['q'],p['r']; return q+(r-(r&1))//2, r
tiles=[]
for i,t in enumerate(m['tiles']):
    vt=v['tiles'][i]
    fog=2 if vt['visible'] else (1 if vt['explored'] else 0)
    tiles.append([T.index(t['terrain']), -1 if t['owner'] is None else t['owner'], fog, 1 if t.get('road') else 0, t.get('resource') or '', 1 if t.get('improved') else 0])
cities=[]
for c in s['cities'].values():
    col,row=off(c['pos']); cities.append(dict(i=row*W+col,o=c['owner'],n=c['name'],p=c['population'],cap=bool(c.get('is_capital') or c.get('original_capital_of') is not None and c['owner']==c.get('original_capital_of')),w=bool(c.get('walls') or c.get('walls_level'))))
units=[]
for u in s['units'].values():
    col,row=off(u['pos']); units.append(dict(i=row*W+col,o=u['owner'],k=u['kind']))
players=[p['faction'] for p in s['players']]
json.dump(dict(W=W,H=H,turn=s['turn'],me=v['me'],tiles=tiles,cities=cities,units=units,players=players),open('site/data.json','w'),separators=(',',':'))
print(W,H,len(cities),len(units),players, v['me'])
